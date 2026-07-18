# app/api/v1/tools/transformers.py

import json
from collections.abc import AsyncIterator, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.core.conversations import (
    get_conversation,
    list_conversations,
    save_conversation,
    update_conversation_messages,
)
from app.core.llm.client import OpenRouterError, compute_cost, stream_completion
from app.core.llm.prompts import chat as chat_prompts
from app.core.llm.prompts import email as email_prompts
from app.core.llm.prompts import social_posts as social_posts_prompts
from app.core.llm.prompts import speech as speech_prompts
from app.core.llm.prompts.reformulator import build_system_prompt
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.quota import consume_words
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import check_quota_dep, get_current_user
from app.models.transformers import (
    ChatRequest,
    EmailWriterRequest,
    ReformulatorRequest,
    SocialPostRequest,
    SpeechRequest,
)
from app.utils.tokens import count_words

router = APIRouter(
    prefix="/tools/transformers", tags=["transformers"], dependencies=[Depends(rate_limit_dep)]
)


async def _run_stream_tool(
    *,
    tool: str,
    user: dict,
    model: str,
    messages: list[dict],
    on_complete: Callable[[str], None] | None = None,
    consume: bool = True,
) -> AsyncIterator[dict]:
    """Patron commun a tous les outils de redaction en streaming : forward les deltas,
    journalise toujours l'usage (cout reel, meme si l'action est gratuite pour
    l'utilisateur), et decremente le quota mots en fin de flux SAUF si consume=False —
    utilise par les generateurs de documents formates (CV, lettre...) dont la generation
    est gratuite, seul le telechargement consomme un quota (downloads).
    on_complete(full_text) permet un effet de bord optionnel (ex. persistance) avant le
    dernier event ; une erreur de persistance ne doit jamais casser le flux deja livre."""
    full_text = ""
    try:
        async for chunk in stream_completion(model, messages):
            if chunk["type"] == "delta":
                full_text += chunk["text"]
                yield {"event": "delta", "data": json.dumps({"text": chunk["text"]})}
            elif chunk["type"] == "usage":
                tokens_in = chunk["tokens_in"]
                tokens_out = chunk["tokens_out"]
                cost = compute_cost(model, tokens_in, tokens_out)
                log_usage(
                    user["user_id"], tool, model, tokens_in, tokens_out, cost, user["tier"]
                )
                yield {
                    "event": "usage",
                    "data": json.dumps(
                        {"tokens_in": tokens_in, "tokens_out": tokens_out, "cost_usd": cost}
                    ),
                }
    except OpenRouterError as exc:
        yield {
            "event": "error",
            "data": json.dumps({"code": "openrouter_error", "message": str(exc)}),
        }
        return

    if on_complete is not None:
        try:
            on_complete(full_text)
        except Exception:
            pass  # la generation a deja ete livree a l'utilisateur ; ne pas casser le flux

    words = count_words(full_text)
    if consume:
        try:
            consume_words(user["user_id"], words)
        except Exception:
            pass  # la generation a deja ete livree ; ne pas casser le flux sur un souci de quota
    yield {"event": "done", "data": json.dumps({"words": words})}


@router.post("/reformulator")
async def reformulator(
    body: ReformulatorRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]
    # Le selecteur de ton n'est actif qu'a partir du palier Goutte.
    tone = body.tone if tier != "introduction" else None

    try:
        model = resolve_model("reformulator", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    messages = [
        {"role": "system", "content": build_system_prompt(body.mode, tone)},
        {"role": "user", "content": body.text},
    ]

    def persist(full_text: str) -> None:
        save_conversation(
            user["user_id"],
            "reformulator",
            title=body.text[:50],
            messages=[
                {"role": "user", "content": body.text},
                {"role": "assistant", "content": full_text},
            ],
        )

    return EventSourceResponse(
        _run_stream_tool(
            tool="reformulator", user=user, model=model, messages=messages, on_complete=persist
        ),
        sep="\n",
    )


@router.get("/reformulator/history")
async def reformulator_history(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_conversations(user["user_id"], "reformulator")


@router.get("/reformulator/history/{conversation_id}")
async def reformulator_history_detail(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    conversation = get_conversation(user["user_id"], "reformulator", conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Introuvable.")
    return conversation


@router.post("/email-writer")
async def email_writer(
    body: EmailWriterRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("email_writer", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    user_message = email_prompts.build_user_message(
        body.description,
        body.tone,
        body.subject,
        body.extra_details,
        body.previous_output,
        body.refine_instruction,
    )
    messages = [
        {"role": "system", "content": email_prompts.SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    def persist(full_text: str) -> None:
        first_line = full_text.split("\n", 1)[0]
        title = first_line[7:].strip() if first_line.lower().startswith("objet:") else body.description[:50]
        save_conversation(
            user["user_id"],
            "email_writer",
            title=title,
            messages=[
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": full_text},
            ],
        )

    return EventSourceResponse(
        _run_stream_tool(
            tool="email_writer", user=user, model=model, messages=messages, on_complete=persist
        ),
        sep="\n",
    )


@router.get("/email-writer/history")
async def email_writer_history(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_conversations(user["user_id"], "email_writer")


@router.get("/email-writer/history/{conversation_id}")
async def email_writer_history_detail(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    conversation = get_conversation(user["user_id"], "email_writer", conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Introuvable.")
    return conversation


@router.post("/social-posts")
async def social_posts(
    body: SocialPostRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("social_posts", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    user_message = social_posts_prompts.build_user_message(
        body.description,
        body.platform,
        body.tone,
        body.target_audience,
        body.keywords,
        body.call_to_action,
        body.previous_output,
        body.refine_instruction,
    )
    messages = [
        {"role": "system", "content": social_posts_prompts.SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    return EventSourceResponse(
        _run_stream_tool(tool="social_posts", user=user, model=model, messages=messages),
        sep="\n",
    )


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("chat", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    existing_messages: list[dict] = []
    if body.conversation_id:
        conversation = get_conversation(user["user_id"], "chat", body.conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation introuvable."
            )
        existing_messages = conversation.get("messages_json") or []

    user_message = {"role": "user", "content": body.message}
    # Contexte compact : les N derniers messages seulement, jamais tout l'historique.
    history_for_llm = (existing_messages + [user_message])[
        -chat_prompts.MAX_HISTORY_MESSAGES :
    ]
    llm_messages = [
        {"role": "system", "content": chat_prompts.SYSTEM_PROMPT},
        *history_for_llm,
    ]

    async def event_stream() -> AsyncIterator[dict]:
        full_text = ""
        try:
            async for chunk in stream_completion(model, llm_messages):
                if chunk["type"] == "delta":
                    full_text += chunk["text"]
                    yield {"event": "delta", "data": json.dumps({"text": chunk["text"]})}
                elif chunk["type"] == "usage":
                    tokens_in = chunk["tokens_in"]
                    tokens_out = chunk["tokens_out"]
                    cost = compute_cost(model, tokens_in, tokens_out)
                    log_usage(user["user_id"], "chat", model, tokens_in, tokens_out, cost, tier)
                    yield {
                        "event": "usage",
                        "data": json.dumps(
                            {
                                "tokens_in": tokens_in,
                                "tokens_out": tokens_out,
                                "cost_usd": cost,
                            }
                        ),
                    }
        except OpenRouterError as exc:
            yield {
                "event": "error",
                "data": json.dumps({"code": "openrouter_error", "message": str(exc)}),
            }
            return

        assistant_message = {"role": "assistant", "content": full_text}
        updated_messages = [*existing_messages, user_message, assistant_message]
        conversation_id = body.conversation_id

        try:
            if conversation_id:
                update_conversation_messages(conversation_id, updated_messages)
            else:
                created = save_conversation(
                    user["user_id"], "chat", title=body.message[:50], messages=updated_messages
                )
                conversation_id = created["id"]
        except Exception:
            pass  # la reponse a deja ete livree ; ne pas casser le flux sur un souci de persistance

        words = count_words(full_text)
        try:
            consume_words(user["user_id"], words)
        except Exception:
            pass  # la reponse a deja ete livree ; ne pas casser le flux sur un souci de quota
        yield {
            "event": "done",
            "data": json.dumps({"words": words, "conversation_id": conversation_id}),
        }

    return EventSourceResponse(event_stream(), sep="\n")


@router.post("/speech-writer")
async def speech_writer(
    body: SpeechRequest,
    user: dict = Depends(check_quota_dep("words")),
):
    tier = user["tier"]

    try:
        model = resolve_model("speech_writer", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    user_message = speech_prompts.build_user_message(
        body.speech_type,
        body.description,
        body.duration,
        body.tone,
        body.key_points,
        body.audience_info,
        body.previous_output,
        body.refine_instruction,
    )
    messages = [
        {"role": "system", "content": speech_prompts.SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    return EventSourceResponse(
        _run_stream_tool(tool="speech_writer", user=user, model=model, messages=messages),
        sep="\n",
    )
