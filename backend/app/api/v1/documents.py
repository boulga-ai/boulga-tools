import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.document_engine.document import get_photo_path, validate_document
from app.core.document_engine.palette import validate_palette_color
from app.core.document_engine.pdf import PdfConversionError, docx_to_pdf
from app.core.document_engine.renderer import RendererError, render
from app.core.documents import (
    delete_document,
    finalize_document_render,
    get_document,
    get_latest_document_by_tool,
)
from app.core.documents import list_documents as list_documents_core
from app.core.quota import consume_download
from app.dependencies import check_quota_dep, get_current_user
from app.models.documents import RenderRequest
from app.utils.filenames import safe_stem
from app.utils.storage import create_signed_url, delete_file, download_file, upload_file

router = APIRouter(prefix="/documents", tags=["documents"])

GENERATED_BUCKET = "generated"
DOWNLOAD_URL_TTL = 15 * 60  # 15 min

# cv/cover_letter : nom de fichier "cv_nom_prenom" / "lm_nom_prenom" quand le nom
# existe dans les blocs — un nom generique (UUID de stockage) ne dit jamais rien au
# user sur ce qu'il vient de telecharger. pro_doc/academic n'ont pas ce concept de
# personne : leur titre (deja specifique, impose par la consigne LLM) suffit tel quel.
_DOC_TYPE_FILE_PREFIX = {"cv": "cv", "cover_letter": "lm"}


def _person_name(doc_type: str, blocks: list) -> str | None:
    if doc_type == "cv":
        for b in blocks:
            if b.type == "contact" and getattr(b, "full_name", ""):
                return b.full_name
    elif doc_type == "cover_letter":
        for b in blocks:
            if b.type == "letter_header" and getattr(b, "sender_name", ""):
                return b.sender_name
    return None


def _download_filename(doc_type: str, title: str, blocks: list) -> str:
    prefix = _DOC_TYPE_FILE_PREFIX.get(doc_type)
    if prefix is None:
        return safe_stem(title) if title else doc_type
    name = _person_name(doc_type, blocks)
    if name:
        return f"{prefix}_{safe_stem(name)}"
    return f"{prefix}_{safe_stem(title)}" if title else prefix


@router.get("")
async def list_documents(tool: str | None = None, user: dict = Depends(get_current_user)) -> list[dict]:
    return list_documents_core(user["user_id"], tool=tool)


@router.get("/latest/{tool}")
async def latest_document(tool: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_latest_document_by_tool(tool, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun document trouvé pour cet outil.")
    return document


@router.get("/{document_id}")
async def get_document_detail(document_id: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")
    return document


@router.get("/{document_id}/download")
async def download_document(document_id: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")
    if not document.get("storage_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ce document n'a pas encore été rendu — choisissez un modèle pour le télécharger.",
        )

    doc_type = document["tool"]
    engine_document = validate_document(doc_type, document.get("content_json") or {})
    filename = _download_filename(doc_type, document.get("title") or "", engine_document.blocks)
    ext = document.get("format") or "docx"
    url = create_signed_url(
        GENERATED_BUCKET, document["storage_path"], DOWNLOAD_URL_TTL, download_filename=f"{filename}.{ext}"
    )
    return {"url": url}


@router.post("/{document_id}/render")
async def render_document(
    document_id: str,
    body: RenderRequest,
    user: dict = Depends(check_quota_dep("downloads")),
) -> dict:
    """Rend le fichier (docx, puis pdf si demande) a partir du JSON de blocs deja
    persiste par POST /documents/{doc_type}/generate. Changer de template ou de
    format ne rappelle jamais le LLM — uniquement ce endpoint, autant de fois que
    voulu ; il met a jour le meme document (le dernier rendu remplace le precedent)."""
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    doc_type = document["tool"]
    engine_document = validate_document(doc_type, document.get("content_json") or {})

    accent_override = validate_palette_color(body.accent_color)
    dark_override = validate_palette_color(body.dark_color)

    # Photo/logo deja rattachee au bloc contact/cover_page (voir document.set_photo_path,
    # appelee a la generation) : retelecharge les octets a CHAQUE rendu plutot que de les
    # persister a part — best-effort, une photo introuvable/supprimee (retention 30j du
    # bucket "uploads") ne doit jamais empecher le reste du document de se rendre.
    photo_path = get_photo_path(doc_type, engine_document)
    photo_bytes = None
    if photo_path:
        try:
            photo_bytes = download_file("uploads", photo_path)
        except Exception:
            photo_bytes = None

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        try:
            docx_path = render(
                engine_document,
                body.template,
                user["tier"],
                tmp_path,
                accent_override,
                dark_override,
                photo_bytes,
            )
        except RendererError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        final_path = docx_path
        if body.format == "pdf":
            try:
                final_path = docx_to_pdf(docx_path, tmp_path)
            except PdfConversionError as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        storage_path = f"{user['user_id']}/{document_id}.{body.format}"
        upload_file(
            GENERATED_BUCKET,
            storage_path,
            final_path.read_bytes(),
            "application/pdf" if body.format == "pdf" else "application/octet-stream",
        )

    updated = finalize_document_render(
        document_id, user["user_id"], body.template, body.format, storage_path, title=body.title
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    try:
        consume_download(user["user_id"])
    except Exception:
        pass  # le fichier est deja rendu et enregistre ; ne pas casser la reponse sur un souci de quota

    filename = _download_filename(doc_type, updated["title"] or "", engine_document.blocks)
    url = create_signed_url(
        GENERATED_BUCKET, storage_path, DOWNLOAD_URL_TTL, download_filename=f"{filename}.{body.format}"
    )
    return {
        "id": updated["id"],
        "title": updated["title"],
        "template": updated["template"],
        "format": updated["format"],
        "url": url,
    }


@router.delete("/{document_id}")
async def remove_document(document_id: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    if document.get("storage_path"):
        delete_file(GENERATED_BUCKET, document["storage_path"])
    delete_document(document_id, user["user_id"])
    return {"status": "ok"}
