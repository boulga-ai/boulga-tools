from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.api.v1.tools.transformers import _run_stream_tool
from app.core.llm.client import OpenRouterError, complete_json, compute_cost
from app.core.llm.prompts import cover_letter as cover_letter_prompts
from app.core.llm.prompts import cv as cv_prompts
from app.core.llm.prompts import pro_doc as pro_doc_prompts
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/tools/generators", tags=["generators"], dependencies=[Depends(rate_limit_dep)]
)


def _resolve_or_403(tool: str, tier: str) -> str:
    try:
        return resolve_model(tool, tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


async def _analyze(tool: str, user: dict, system_prompt: str, user_message: str) -> dict:
    profile_tier = user["tier"]
    model = _resolve_or_403(tool, profile_tier)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]
    try:
        data, usage = await complete_json(model, messages)
    except OpenRouterError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    cost = compute_cost(model, usage["tokens_in"], usage["tokens_out"])
    log_usage(user["user_id"], f"{tool}_analyze", model, usage["tokens_in"], usage["tokens_out"], cost, profile_tier)
    return data


@router.post("/cv/analyze")
async def cv_analyze(body: dict, user: dict = Depends(get_current_user)) -> dict:
    return await _analyze(
        "cv_writer", user, cv_prompts.ANALYZE_PROMPT, cv_prompts.build_analyze_user_message(body)
    )


@router.post("/cv")
async def cv_generate(body: dict, user: dict = Depends(get_current_user)):
    tier = user["tier"]
    model = _resolve_or_403("cv_writer", tier)

    messages = [
        {"role": "system", "content": cv_prompts.build_generate_prompt()},
        {"role": "user", "content": cv_prompts.build_generate_user_message(body)},
    ]
    return EventSourceResponse(
        _run_stream_tool(
            tool="cv_writer", user={**user, "tier": tier}, model=model, messages=messages, consume=False
        ),
        sep="\n",
    )


@router.post("/cover-letter/analyze")
async def cover_letter_analyze(body: dict, user: dict = Depends(get_current_user)) -> dict:
    return await _analyze(
        "cover_letter",
        user,
        cover_letter_prompts.ANALYZE_PROMPT,
        cover_letter_prompts.build_analyze_user_message(body),
    )


@router.post("/cover-letter")
async def cover_letter_generate(body: dict, user: dict = Depends(get_current_user)):
    tier = user["tier"]
    model = _resolve_or_403("cover_letter", tier)

    messages = [
        {"role": "system", "content": cover_letter_prompts.build_generate_prompt()},
        {"role": "user", "content": cover_letter_prompts.build_generate_user_message(body)},
    ]
    return EventSourceResponse(
        _run_stream_tool(
            tool="cover_letter", user={**user, "tier": tier}, model=model, messages=messages, consume=False
        ),
        sep="\n",
    )


@router.post("/pro-doc/analyze")
async def pro_doc_analyze(body: dict, user: dict = Depends(get_current_user)) -> dict:
    return await _analyze(
        "pro_doc_writer",
        user,
        pro_doc_prompts.ANALYZE_PROMPT,
        pro_doc_prompts.build_analyze_user_message(body),
    )


@router.post("/pro-doc")
async def pro_doc_generate(body: dict, user: dict = Depends(get_current_user)):
    tier = user["tier"]
    model = _resolve_or_403("pro_doc_writer", tier)

    messages = [
        {"role": "system", "content": pro_doc_prompts.build_generate_prompt()},
        {"role": "user", "content": pro_doc_prompts.build_generate_user_message(body)},
    ]
    return EventSourceResponse(
        _run_stream_tool(
            tool="pro_doc_writer", user={**user, "tier": tier}, model=model, messages=messages, consume=False
        ),
        sep="\n",
    )
