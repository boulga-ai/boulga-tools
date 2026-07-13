from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.api.v1.tools.transformers import _run_stream_tool
from app.core.llm.prompts import planner as planner_prompts
from app.core.llm.router import ModelNotAvailableError, resolve_model
from app.core.rate_limit import rate_limit_dep
from app.dependencies import get_current_user
from app.models.planner import PlannerRequest

router = APIRouter(prefix="/tools", tags=["planner"], dependencies=[Depends(rate_limit_dep)])


@router.post("/planner")
async def generate_plan(body: PlannerRequest, user: dict = Depends(get_current_user)):
    tier = user["tier"]

    try:
        model = resolve_model("planner", tier)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    messages = [
        {"role": "system", "content": planner_prompts.build_system_prompt()},
        {
            "role": "user",
            "content": planner_prompts.build_user_message(body.subject, body.doc_type, body.depth),
        },
    ]

    return EventSourceResponse(
        _run_stream_tool(
            tool="planner", user={**user, "tier": tier}, model=model, messages=messages, consume=False
        ),
        sep="\n",
    )
