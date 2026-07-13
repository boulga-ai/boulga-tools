from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.admin import (
    get_costs,
    get_kpis,
    get_user_detail,
    list_users,
    reset_user_quota,
    set_user_tier,
)
from app.dependencies import require_admin
from app.models.admin import SetTierRequest

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/kpis")
async def read_kpis() -> dict:
    return get_kpis()


@router.get("/users")
async def read_users(
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
) -> dict:
    return list_users(search, page, per_page)


@router.get("/users/{user_id}")
async def read_user_detail(user_id: str) -> dict:
    detail = get_user_detail(user_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    return detail


@router.patch("/users/{user_id}/tier")
async def update_user_tier(user_id: str, body: SetTierRequest) -> dict:
    set_user_tier(user_id, body.tier)
    return {"status": "ok"}


@router.post("/users/{user_id}/reset-quota")
async def reset_quota(user_id: str) -> dict:
    reset_user_quota(user_id)
    return {"status": "ok"}


@router.get("/costs")
async def read_costs(period: Literal["7d", "30d", "90d"] = "30d") -> list[dict]:
    return get_costs(period)
