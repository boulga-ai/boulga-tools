import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from app.core.document_engine import templates as _templates  # noqa: F401  (enregistre les templates)
from app.core.document_engine.pdf import PdfConversionError, docx_to_pdf
from app.core.document_engine.renderer import RendererError, render
from app.core.document_engine.schema import DOC_TYPE_SCHEMAS
from app.core.documents import delete_document, get_document, insert_document
from app.core.documents import list_documents as list_documents_core
from app.core.quota import consume_download
from app.dependencies import check_quota_dep, get_current_user
from app.models.documents import RenderRequest, RerenderRequest
from app.utils.storage import create_signed_url, delete_file, upload_file

router = APIRouter(prefix="/documents", tags=["documents"])

GENERATED_BUCKET = "generated"
DOWNLOAD_URL_TTL = 15 * 60  # 15 min


def _validate_content(doc_type: str, content_json: dict):
    schema = DOC_TYPE_SCHEMAS[doc_type]
    try:
        return schema.model_validate(content_json)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contenu invalide pour le type '{doc_type}' : {exc.error_count()} erreur(s).",
        )


def _render_and_publish(
    user_id: str, content, template: str, doc_format: str, title: str, doc_type: str
) -> dict:
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        try:
            docx_path = render(content, template, tmp_path)
        except RendererError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        final_path = docx_path
        if doc_format == "pdf":
            try:
                final_path = docx_to_pdf(docx_path, tmp_path)
            except PdfConversionError as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        document_id = str(uuid.uuid4())
        storage_path = f"{user_id}/{document_id}.{doc_format}"
        upload_file(
            GENERATED_BUCKET,
            storage_path,
            final_path.read_bytes(),
            "application/pdf" if doc_format == "pdf" else "application/octet-stream",
        )

    document = insert_document(
        document_id,
        user_id,
        doc_type,
        title,
        template,
        doc_format,
        storage_path,
        content.model_dump(mode="json"),
    )

    consume_download(user_id)
    url = create_signed_url(GENERATED_BUCKET, storage_path, DOWNLOAD_URL_TTL)

    return {
        "id": document["id"],
        "title": document["title"],
        "template": document["template"],
        "format": document["format"],
        "url": url,
    }


@router.post("/render")
async def render_document(
    body: RenderRequest,
    user: dict = Depends(check_quota_dep("downloads")),
) -> dict:
    content = _validate_content(body.doc_type, body.content_json)
    return _render_and_publish(
        user["user_id"], content, body.template, body.format, body.title, body.doc_type
    )


@router.get("")
async def list_documents(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_documents_core(user["user_id"])


@router.get("/{document_id}/download")
async def download_document(document_id: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    url = create_signed_url(GENERATED_BUCKET, document["storage_path"], DOWNLOAD_URL_TTL)
    return {"url": url}


@router.post("/{document_id}/rerender")
async def rerender_document(
    document_id: str,
    body: RerenderRequest,
    user: dict = Depends(check_quota_dep("downloads")),
) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    doc_type = document["tool"]
    content = _validate_content(doc_type, document["content_json"])
    return _render_and_publish(
        user["user_id"], content, body.template, body.format, document["title"], doc_type
    )


@router.delete("/{document_id}")
async def remove_document(document_id: str, user: dict = Depends(get_current_user)) -> dict:
    document = get_document(document_id, user["user_id"])
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")

    delete_file(GENERATED_BUCKET, document["storage_path"])
    delete_document(document_id, user["user_id"])
    return {"status": "ok"}
