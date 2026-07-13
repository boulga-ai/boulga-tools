from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.api.v1.tools.transformers import _run_stream_tool
from app.core.academic_sessions import create_session, get_session, list_sessions, update_session
from app.core.llm.client import OpenRouterError, complete_json, complete_text, compute_cost
from app.core.llm.prompts import academic as academic_prompts
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import get_current_user
from app.models.academic import (
    CreateSessionRequest,
    GenerateOutlineRequest,
    SectionActionRequest,
    SuggestTopicsRequest,
    UpdateSessionRequest,
)
from app.utils.tokens import count_words

router = APIRouter(
    prefix="/tools/generators/academic", tags=["academic"], dependencies=[Depends(rate_limit_dep)]
)


def _resolve_or_403(tier: str) -> str:
    try:
        return resolve_model("academic_writer", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def _get_session_or_404(user_id: str, session_id: str) -> dict:
    session = get_session(user_id, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable.")
    return session


@router.post("/sessions")
async def create_academic_session(
    body: CreateSessionRequest, user: dict = Depends(get_current_user)
) -> dict:
    return create_session(user["user_id"], body.doc_type)


@router.get("/sessions")
async def get_sessions(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_sessions(user["user_id"])


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, user: dict = Depends(get_current_user)) -> dict:
    return _get_session_or_404(user["user_id"], session_id)


@router.patch("/sessions/{session_id}")
async def patch_session(
    session_id: str, body: UpdateSessionRequest, user: dict = Depends(get_current_user)
) -> dict:
    _get_session_or_404(user["user_id"], session_id)
    updated = update_session(user["user_id"], session_id, body.to_fields())
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable.")
    return updated


@router.post("/suggest-topics")
async def suggest_topics(body: SuggestTopicsRequest, user: dict = Depends(get_current_user)) -> dict:
    tier = user["tier"]
    model = _resolve_or_403(tier)

    messages = [
        {"role": "user", "content": academic_prompts.build_suggest_topics_message(body.doc_type, body.domain)}
    ]
    try:
        data, usage = await complete_json(model, messages)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(
        user["user_id"], "academic_suggest_topics", model, usage["tokens_in"], usage["tokens_out"], cost, tier
    )
    topics = data if isinstance(data, list) else data.get("topics", [])
    return {"topics": topics}


@router.post("/generate-outline")
async def generate_outline(body: GenerateOutlineRequest, user: dict = Depends(get_current_user)):
    tier = user["tier"]
    model = _resolve_or_403(tier)

    messages = [{"role": "user", "content": academic_prompts.build_outline_message(body.doc_type, body.topic)}]
    return EventSourceResponse(
        _run_stream_tool(
            tool="academic_writer", user={**user, "tier": tier}, model=model, messages=messages, consume=False
        ),
        sep="\n",
    )


def _outline_summary_text(outline_json: dict) -> str:
    lines: list[str] = []

    def walk(sections: list[dict], depth: int = 0) -> None:
        for section in sections:
            lines.append("  " * depth + f"- {section['title']}")
            walk(section.get("children", []), depth + 1)

    walk(outline_json.get("sections", []))
    return "\n".join(lines)


def _find_section_title(outline_json: dict, section_id: str) -> str | None:
    def walk(sections: list[dict]) -> str | None:
        for section in sections:
            if section["id"] == section_id:
                return section["title"]
            found = walk(section.get("children", []))
            if found:
                return found
        return None

    return walk(outline_json.get("sections", []))


def _previous_summaries_text(sections_json: dict) -> str:
    summaries = [
        f"- {data['summary']}"
        for data in sections_json.values()
        if data.get("status") == "valide" and data.get("summary")
    ]
    return "\n".join(summaries)


async def _generate_section_stream(session: dict, section_id: str, user: dict):
    outline_json = session.get("outline_json") or {"sections": []}
    section_title = _find_section_title(outline_json, section_id)
    if not section_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Section introuvable dans le plan."
        )

    tier = user["tier"]
    model = _resolve_or_403(tier)

    message = academic_prompts.build_section_message(
        section_title,
        session["doc_type"],
        session.get("topic") or "",
        session.get("domain") or "",
        _outline_summary_text(outline_json),
        _previous_summaries_text(session.get("sections_json") or {}),
    )
    messages = [{"role": "user", "content": message}]

    def on_complete(full_text: str) -> None:
        sections_json = dict(session.get("sections_json") or {})
        existing = sections_json.get(section_id, {})
        sections_json[section_id] = {
            "content": full_text,
            "status": "genere",
            "summary": existing.get("summary"),
            "words": count_words(full_text),
        }
        update_session(user["user_id"], session["id"], {"sections_json": sections_json})

    return EventSourceResponse(
        _run_stream_tool(
            tool="academic_writer",
            user={**user, "tier": tier},
            model=model,
            messages=messages,
            consume=False,
            on_complete=on_complete,
        ),
        sep="\n",
    )


@router.post("/generate-section")
async def generate_section(body: SectionActionRequest, user: dict = Depends(get_current_user)):
    session = _get_session_or_404(user["user_id"], body.session_id)
    return await _generate_section_stream(session, body.section_id, user)


@router.post("/regenerate-section")
async def regenerate_section(body: SectionActionRequest, user: dict = Depends(get_current_user)):
    session = _get_session_or_404(user["user_id"], body.session_id)
    return await _generate_section_stream(session, body.section_id, user)


@router.post("/validate-section")
async def validate_section(body: SectionActionRequest, user: dict = Depends(get_current_user)) -> dict:
    session = _get_session_or_404(user["user_id"], body.session_id)
    sections_json = dict(session.get("sections_json") or {})
    section = sections_json.get(body.section_id)
    if not section or not section.get("content"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cette section n'a pas encore ete generee."
        )

    tier = user["tier"]
    model = _resolve_or_403(tier)
    messages = [{"role": "user", "content": academic_prompts.build_summarize_message(section["content"])}]
    try:
        summary, usage = await complete_text(model, messages)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(user["user_id"], "academic_summarize", model, usage["tokens_in"], usage["tokens_out"], cost, tier)

    sections_json[body.section_id] = {**section, "status": "valide", "summary": summary}
    updated = update_session(user["user_id"], body.session_id, {"sections_json": sections_json})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable.")
    return updated
