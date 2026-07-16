from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sse_starlette.sse import EventSourceResponse

from app.api.v1.tools.transformers import _run_stream_tool
from app.core.llm.client import OpenRouterError, compute_cost
from app.core.llm.detection import detect_ai_content, detect_plagiarism
from app.core.llm.prompts import plagiarism as plagiarism_prompts
from app.core.llm.prompts.ai_rewrite import build_system_prompt
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.quota import consume_scan
from app.core.rate_limit import rate_limit_dep
from app.core.usage import log_usage
from app.dependencies import check_quota_dep
from app.models.analyzers import AiRewriteRequest, PlagiarismCorrectRequest
from app.utils.text_extraction import ExtractionError, extract_text

router = APIRouter(
    prefix="/tools/analyzers", tags=["analyzers"], dependencies=[Depends(rate_limit_dep)]
)


async def _resolve_input_text(text: str | None, file: UploadFile | None) -> str:
    if file is not None:
        content = await file.read()
        try:
            return extract_text(file.filename or "fichier.txt", content)
        except ExtractionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if text and text.strip():
        return text.strip()

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Fournissez un texte ou un fichier (PDF, DOCX, TXT).",
    )


@router.post("/ai-detector/scan")
async def ai_detector_scan(
    text: str | None = Form(None),
    file: UploadFile | None = None,
    user: dict = Depends(check_quota_dep("scans")),
) -> dict:
    input_text = await _resolve_input_text(text, file)

    try:
        model = resolve_model("ai_detector_scan", user["tier"])
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    try:
        result, usage = await detect_ai_content(input_text, model)
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

    return {"text": input_text, **result}


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
    input_text = await _resolve_input_text(text, file)

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

    return {"text": input_text, **result}


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
