from fastapi import APIRouter, Depends

from app.core.rate_limit import rate_limit_dep
from app.core.saved_generations import list_generations, save_generation
from app.dependencies import get_current_user
from app.models.saved_generations import SavedGenerationRequest

router = APIRouter(
    prefix="/tools", tags=["saved_generations"], dependencies=[Depends(rate_limit_dep)]
)


@router.post("/saved-generations")
async def create_saved_generation(
    body: SavedGenerationRequest, user: dict = Depends(get_current_user)
) -> dict:
    return save_generation(user["user_id"], body.tool, body.content, body.metadata)


@router.get("/saved-generations")
async def get_saved_generations(tool: str, user: dict = Depends(get_current_user)) -> list[dict]:
    return list_generations(user["user_id"], tool)
