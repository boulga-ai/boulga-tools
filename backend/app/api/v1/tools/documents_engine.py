"""Routeur generique du moteur documentaire V3 : deux endpoints (analyze, generate)
partages par les 4 types de documents (cv, cover_letter, pro_doc, academic). Aucune
logique specifique a un type de document ici — tout est pilote par DOCUMENT_SCHEMAS
et les prompts guides ; ce fichier ne fait qu'orchestrer l'appel LLM et le streaming."""

import json
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.core.document_engine.blocks import DOCUMENT_SCHEMAS
from app.core.document_engine.document import Document, validate_document
from app.core.documents import insert_document_draft
from app.core.llm.client import OpenRouterError, complete_json, compute_cost, stream_blocks
from app.core.llm.prompts.doc_engine import build_messages, build_segment_messages
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import get_current_user, get_current_user_with_tier
from app.utils.text_extraction import ExtractionError, extract_text

router = APIRouter(prefix="/documents", tags=["documents_engine"], dependencies=[Depends(rate_limit_dep)])

# doc_type (vocabulaire de blocs) -> tool (matrice de routage LLM, app/core/llm/router.py).
# Noms distincts car router.py nomme historiquement ses outils avec un suffixe
# "_writer"/"_letter" ; on ne renomme pas la matrice de routage pour ne pas perturber
# usage_logs (tool y est deja une cle d'analyse cout par outil).
DOC_TYPE_TOOL: dict[str, str] = {
    "cv": "cv_writer",
    "cover_letter": "cover_letter",
    "pro_doc": "pro_doc_writer",
    "academic": "academic_writer",
}


class PlanItem(BaseModel):
    heading: str
    summary: str = ""


class DocEngineContext(BaseModel):
    cadrage: dict = Field(default_factory=dict)
    history: list[dict] = Field(default_factory=list)
    validated_info: dict = Field(default_factory=dict)
    plan: list[PlanItem] | None = None
    user_message: str = ""
    request_plan: bool = False
    adjust_instruction: str | None = None
    # "competence" reste un vocabulaire produit abstrait — jamais un nom de modele
    # expose au user (voir router.resolve_model). "depth" reutilise l'echelle deja
    # existante du Generateur de plan (app/models/planner.py PlannerDepth) ; ignoree
    # pour cv/cover_letter (voir doc_engine._DOC_TYPES_WITHOUT_DEPTH). "template" ne
    # sert au rendu que pour pro_doc/academic (skin pur) ; pour cv/cover_letter il
    # conditionne aussi ce que le LLM produit (voir blocks.TEMPLATE_OVERRIDES).
    competence: Literal["standard", "expert"] = "standard"
    depth: Literal["essentiel", "detaille", "tres_detaille"] = "detaille"
    template: str | None = None


class AnalyzeRequest(BaseModel):
    context: DocEngineContext


class GenerateRequest(BaseModel):
    context: DocEngineContext


def _check_doc_type(doc_type: str) -> None:
    if doc_type not in DOCUMENT_SCHEMAS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Type de document inconnu : {doc_type}")


def _resolve_or_403(doc_type: str, tier: str, competence: str = "standard") -> str:
    try:
        return resolve_model(DOC_TYPE_TOOL[doc_type], tier, competence)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def _infer_title(doc_type: str, document: Document, cadrage: dict) -> str:
    for block in document.blocks:
        if block.type == "cover_page":
            return block.title
        if block.type == "contact":
            return f"CV - {block.full_name}" if block.full_name else "CV"
        if block.type == "letter_header":
            target = block.company_name or block.recipient_name
            return f"Lettre de motivation - {target}" if target else "Lettre de motivation"
        if block.type == "heading" and block.level == 1:
            return block.text
    return cadrage.get("title") or cadrage.get("target_role") or f"Document {doc_type}"


@router.post("/extract-text")
async def extract_document_text(file: UploadFile, user: dict = Depends(get_current_user)) -> dict:
    """Extrait le texte brut d'un fichier joint (PDF/DOCX/TXT) pour l'injecter dans le
    composeur du chat (voir DocumentWorkspace/ChatInput) — aucun appel LLM ici, juste
    de la lecture de fichier, jamais de quota a verifier."""
    content = await file.read()
    try:
        text = extract_text(file.filename or "fichier.txt", content)
    except ExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"text": text}


@router.post("/{doc_type}/analyze")
async def analyze_document(
    doc_type: str, body: AnalyzeRequest, user: dict = Depends(get_current_user_with_tier)
) -> dict:
    """N'ecrit jamais de document — enrichit seulement le contexte de travail
    (message, questions, suggestions, plan optionnel). Appelable autant de fois que
    le user le souhaite ; chaque appel voit l'historique et les infos validees
    accumules jusque-la."""
    _check_doc_type(doc_type)
    tier = user["tier"]
    model = _resolve_or_403(doc_type, tier, body.context.competence)

    messages = build_messages({**body.context.model_dump(), "doc_type": doc_type}, "analyze")
    try:
        data, usage = await complete_json(model, messages)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(
        user["user_id"],
        f"{DOC_TYPE_TOOL[doc_type]}_analyze",
        model,
        usage["tokens_in"],
        usage["tokens_out"],
        cost,
        tier,
    )
    return data


def _fallback_summary(segment_blocks: list[dict]) -> str:
    """Resume de secours si le LLM n'a pas produit de ligne SUMMARY: en fin de
    segment — concatene le texte des blocs du segment et tronque a 200 caracteres."""
    parts: list[str] = []
    for block in segment_blocks:
        text = block.get("text")
        if not text and isinstance(block.get("items"), list):
            text = " ".join(str(item) for item in block["items"])
        if text:
            parts.append(str(text))
    joined = " ".join(parts).strip()
    return joined[:200] if joined else "(section rédigée)"


def _chunk_plan(plan: list[dict], size: int) -> list[list[dict]]:
    step = max(size, 1)
    return [plan[i : i + step] for i in range(0, len(plan), step)]


@router.post("/{doc_type}/generate")
async def generate_document(
    doc_type: str, body: GenerateRequest, user: dict = Depends(get_current_user_with_tier)
):
    """Toujours disponible, meme sans jamais avoir appele /analyze et meme avec un
    contexte partiel : le LLM construit son propre plan en interne et produit le
    document complet. Streame chaque bloc en SSE des qu'il est parsable (JSONL),
    puis persiste le JSON final (sans rendre de fichier — voir V3-5).

    Pour l'academique avec un plan long (au-dela de settings.ACADEMIC_SEGMENT_THRESHOLD
    sections), la generation est decoupee en plusieurs appels LLM successifs plutot
    qu'un seul appel monolithique — invisible pour le user, qui voit toujours les
    blocs arriver au fil de l'eau. Les 3 autres types de documents ne sont jamais
    concernes (toujours courts)."""
    _check_doc_type(doc_type)
    tier = user["tier"]
    model = _resolve_or_403(doc_type, tier, body.context.competence)

    context_dict = {**body.context.model_dump(), "doc_type": doc_type}
    plan = [p.model_dump() for p in body.context.plan] if body.context.plan else []
    segmented = doc_type == "academic" and len(plan) > settings.ACADEMIC_SEGMENT_THRESHOLD

    async def event_stream():
        raw_blocks: list[dict] = []
        total_usage = {"tokens_in": 0, "tokens_out": 0}

        try:
            if segmented:
                summaries: list[str] = []
                for segment_sections in _chunk_plan(plan, settings.ACADEMIC_SEGMENT_SIZE):
                    segment_messages = build_segment_messages(context_dict, plan, segment_sections, summaries)
                    segment_blocks: list[dict] = []
                    segment_summary: str | None = None
                    async for chunk in stream_blocks(model, segment_messages):
                        if chunk["type"] == "block":
                            segment_blocks.append(chunk["data"])
                            raw_blocks.append(chunk["data"])
                            yield {"event": "block", "data": json.dumps(chunk["data"])}
                        elif chunk["type"] == "text_line" and chunk["text"].upper().startswith("SUMMARY:"):
                            segment_summary = chunk["text"].split(":", 1)[1].strip()
                        elif chunk["type"] == "usage":
                            total_usage["tokens_in"] += chunk["tokens_in"]
                            total_usage["tokens_out"] += chunk["tokens_out"]
                    summaries.append(segment_summary or _fallback_summary(segment_blocks))
            else:
                messages = build_messages(context_dict, "generate")
                async for chunk in stream_blocks(model, messages):
                    if chunk["type"] == "block":
                        raw_blocks.append(chunk["data"])
                        yield {"event": "block", "data": json.dumps(chunk["data"])}
                    elif chunk["type"] == "usage":
                        total_usage = {"tokens_in": chunk["tokens_in"], "tokens_out": chunk["tokens_out"]}
        except OpenRouterError as exc:
            yield {"event": "error", "data": json.dumps({"code": "openrouter_error", "message": str(exc)})}
            return

        cost = compute_cost(model, total_usage["tokens_in"], total_usage["tokens_out"])
        try:
            log_usage(
                user["user_id"],
                f"{DOC_TYPE_TOOL[doc_type]}_generate",
                model,
                total_usage["tokens_in"],
                total_usage["tokens_out"],
                cost,
                tier,
            )
        except Exception:
            pass  # le document a deja ete livre ; ne pas casser le flux sur un souci de log

        document = validate_document(
            doc_type, {"blocks": raw_blocks, "meta": body.context.cadrage}, body.context.template
        )
        title = _infer_title(doc_type, document, body.context.cadrage)

        document_id = str(uuid.uuid4())
        try:
            insert_document_draft(
                document_id,
                user["user_id"],
                doc_type,
                title,
                document.model_dump(mode="json"),
            )
        except Exception:
            document_id = None  # le document a deja ete livre au frontend ; la persistance echoue proprement

        yield {
            "event": "done",
            "data": json.dumps(
                {
                    "document_id": document_id,
                    "title": title,
                    "blocks": [b.model_dump(mode="json") for b in document.blocks],
                }
            ),
        }

    return EventSourceResponse(event_stream(), sep="\n")
