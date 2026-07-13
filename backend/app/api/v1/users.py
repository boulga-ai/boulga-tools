from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.quota import get_quota_history
from app.db.supabase import get_service_client
from app.dependencies import get_current_user, get_profile
from app.utils.storage import delete_user_files

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = None


@router.get("/me")
async def read_me(user: dict = Depends(get_current_user)) -> dict:
    profile = get_profile(user["user_id"])
    return {
        "id": profile["id"],
        "email": user["email"],
        "full_name": profile["full_name"],
        "phone": profile.get("phone"),
        "current_tier": profile["current_tier"],
        "role": profile["role"],
    }


@router.patch("/me")
async def update_me(body: UpdateProfileRequest, user: dict = Depends(get_current_user)) -> dict:
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if fields:
        client = get_service_client()
        client.table("profiles").update(fields).eq("id", user["user_id"]).execute()
    return await read_me(user)


@router.delete("/me")
async def delete_me(user: dict = Depends(get_current_user)) -> dict:
    delete_user_files(user["user_id"])
    client = get_service_client()
    client.auth.admin.delete_user(user["user_id"])
    return {"status": "ok"}


@router.get("/me/quota/history")
async def quota_history(user: dict = Depends(get_current_user)) -> list[dict]:
    return get_quota_history(user["user_id"])
