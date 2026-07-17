import json
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sse_starlette.sse import EventSourceResponse

from app.api.v1.tools.transformers import _run_stream_tool
from app.core.conversations import get_conversation, list_conversations, save_conversation
from app.core.llm.client import OpenRouterError, compute_cost
from app.core.llm.detection import detect_ai_content, detect_plagiarism
from app.core.llm.prompts import plagiarism as plagiarism_prompts
from app.core.llm.prompts.ai_rewrite import build_system_prompt
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.quota import consume_scan
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import check_quota_dep, get_current_user
from app.models.analyzers import AiRewriteRequest, PlagiarismCorrectRequest
from app.utils.storage import create_signed_url, upload_file
from app.utils.text_extraction import ExtractionError, extract_pages

router = APIRouter(
    prefix="/tools/analyzers", tags=["analyzers"], dependencies=[Depends(rate_limit_dep)]
)

UPLOADS_BUCKET = "uploads"
# Duree de vie de l'URL signee generee a la (re)consultation d'un historique - courte
# car regeneree a chaque ouverture, pas besoin de duree longue (cf. meme convention que
# DOWNLOAD_URL_TTL dans api/v1/documents.py).
HISTORY_FILE_URL_TTL = 15 * 60


def _persist_scan(
    user_id: str,
    tool: str,
    input_text: str,
    result: dict,
    file_path: str | None = None,
    file_name: str | None = None,
) -> None:
    """Journalise un scan dans l'historique (reutilise la table conversations : le
    resultat structure — scores, passages signales — est stocke tel quel en JSON dans
    le message assistant, pas de nouvelle table pour ce format specifique). Si un
    fichier a ete uploade, son chemin de stockage prive est inclus (jamais l'URL
    signee, qui expire) - voir _attach_file_url pour la resolution a la lecture."""
    try:
        payload = dict(result)
        if file_path:
            payload["file_path"] = file_path
            payload["file_name"] = file_name
        save_conversation(
            user_id,
            tool,
            title=input_text[:50],
            messages=[
                {"role": "user", "content": input_text},
                {"role": "assistant", "content": json.dumps(payload)},
            ],
        )
    except Exception:
        pass  # le scan a deja ete livre a l'utilisateur ; ne pas casser la reponse


def _attach_file_url(conversation: dict) -> dict:
    """Remplace file_path (chemin de stockage prive, jamais expose tel quel) par
    file_url (URL signee, prete a etre fetchee par le frontend) dans le message
    assistant d'un historique de scan, si un fichier a ete conserve."""
    for message in conversation.get("messages_json") or []:
        if message.get("role") != "assistant":
            continue
        try:
            payload = json.loads(message["content"])
        except (json.JSONDecodeError, KeyError, TypeError):
            continue
        file_path = payload.pop("file_path", None)
        if file_path:
            try:
                payload["file_url"] = create_signed_url(
                    UPLOADS_BUCKET, file_path, HISTORY_FILE_URL_TTL
                )
            except Exception:
                pass  # pas de fichier disponible ; l'historique texte reste consultable
        message["content"] = json.dumps(payload)
    return conversation


async def _resolve_input_pages(
    text: str | None, file: UploadFile | None
) -> tuple[list[str], bool, bytes | None, str | None, str | None]:
    """Renvoie (pages, pages_exact, octets_bruts, nom_fichier, content_type). Les 3
    derniers sont None si l'entree est du texte colle (pas de fichier a persister).
    pages_exact indique si les frontieres de page sont fiables (PDF ; DOCX avec
    coupures manuelles) ou approximees (DOCX sans coupures, decoupe par mots ; texte
    colle, une seule "page" par definition)."""
    if file is not None:
        content = await file.read()
        try:
            pages, exact = extract_pages(file.filename or "fichier.txt", content)
        except ExtractionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return pages, exact, content, file.filename, file.content_type

    if text and text.strip():
        return [text.strip()], True, None, None, None

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Fournissez un texte ou un fichier (PDF, DOCX, TXT).",
    )


def _store_uploaded_file(user_id: str, content: bytes, filename: str, content_type: str | None) -> str | None:
    """Upload best-effort vers le bucket 'uploads' - un echec ne doit jamais casser le
    scan, qui a deja son resultat pret a etre renvoye."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    path = f"{user_id}/{uuid.uuid4()}.{ext}"
    try:
        upload_file(UPLOADS_BUCKET, path, content, content_type or "application/octet-stream")
        return path
    except Exception:
        return None


@router.post("/ai-detector/scan")
async def ai_detector_scan(
    text: str | None = Form(None),
    file: UploadFile | None = None,
    user: dict = Depends(check_quota_dep("scans")),
) -> dict:
    pages, pages_exact, file_bytes, file_name, content_type = await _resolve_input_pages(
        text, file
    )

    try:
        model = resolve_model("ai_detector_scan", user["tier"])
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    try:
        result, usage = await detect_ai_content(pages, user["tier"], model)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(
        user["user_id"],
        "ai_detector_scan",
        model,
        usage["tokens_in"],
        usage["tokens_out"],
        cost,
        user["tier"],
    )
    consume_scan(user["user_id"])

    # Seuls les scans de FICHIER vont dans l'historique - le texte colle est ephemere
    # par design (voir mode "texte" cote frontend, jamais persiste).
    if file_bytes is not None and file_name is not None:
        file_path = _store_uploaded_file(user["user_id"], file_bytes, file_name, content_type)
        # result["text"] est le texte des pages retenues (post-plafond palier), pas
        # forcement le document entier — coherent avec les offsets de flagged_spans.
        _persist_scan(user["user_id"], "ai_detector_scan", result["text"], result, file_path, file_name)

    return {"pages_exact": pages_exact, **result}


@router.get("/ai-detector/history")
async def ai_detector_history(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_conversations(user["user_id"], "ai_detector_scan")


@router.get("/ai-detector/history/{conversation_id}")
async def ai_detector_history_detail(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    conversation = get_conversation(user["user_id"], "ai_detector_scan", conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Introuvable.")
    return _attach_file_url(conversation)


@router.post("/ai-detector/rewrite")
async def ai_detector_rewrite(
    body: AiRewriteRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("ai_detector_rewrite", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    messages = [
        {"role": "system", "content": build_system_prompt(body.tone)},
        {"role": "user", "content": body.text},
    ]

    return EventSourceResponse(
        _run_stream_tool(tool="ai_detector_rewrite", user=user, model=model, messages=messages),
        sep="\n",
    )


@router.post("/plagiarism/scan")
async def plagiarism_scan(
    text: str | None = Form(None),
    file: UploadFile | None = None,
    user: dict = Depends(check_quota_dep("scans")),
) -> dict:
    pages, _, file_bytes, file_name, content_type = await _resolve_input_pages(text, file)
    input_text = "\n\n".join(pages)

    try:
        model = resolve_model("plagiarism_scan", user["tier"])
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    try:
        result, usage = await detect_plagiarism(input_text, model)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(
        user["user_id"],
        "plagiarism_scan",
        model,
        usage["tokens_in"],
        usage["tokens_out"],
        cost,
        user["tier"],
    )
    consume_scan(user["user_id"])

    # Seuls les scans de FICHIER vont dans l'historique - le texte colle est ephemere
    # par design (voir mode "texte" cote frontend, jamais persiste).
    if file_bytes is not None and file_name is not None:
        file_path = _store_uploaded_file(user["user_id"], file_bytes, file_name, content_type)
        _persist_scan(user["user_id"], "plagiarism_scan", input_text, result, file_path, file_name)

    return {"text": input_text, **result}


@router.get("/plagiarism/history")
async def plagiarism_history(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_conversations(user["user_id"], "plagiarism_scan")


@router.get("/plagiarism/history/{conversation_id}")
async def plagiarism_history_detail(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    conversation = get_conversation(user["user_id"], "plagiarism_scan", conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Introuvable.")
    return _attach_file_url(conversation)


@router.post("/plagiarism/correct")
async def plagiarism_correct(
    body: PlagiarismCorrectRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("plagiarism_correction", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    messages = [
        {"role": "system", "content": plagiarism_prompts.build_system_prompt(body.tone)},
        {
            "role": "user",
            "content": plagiarism_prompts.build_user_message(body.text, body.flagged_passages),
        },
    ]

    return EventSourceResponse(
        _run_stream_tool(
            tool="plagiarism_correction", user=user, model=model, messages=messages
        ),
        sep="\n",
    )
