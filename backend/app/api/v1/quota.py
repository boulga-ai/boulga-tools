from fastapi import APIRouter, Depends

from app.core.quota import get_or_create_quota
from app.dependencies import get_current_user, get_profile

router = APIRouter(tags=["quota"])


@router.get("/quota")
async def read_quota(user: dict = Depends(get_current_user)) -> dict:
    profile = get_profile(user["user_id"])
    quota = get_or_create_quota(user["user_id"], profile["current_tier"])
    return {
        "period": quota["period"],
        "words_remaining": max(quota["words_limit"] - quota["words_used"], 0),
        "words_limit": quota["words_limit"],
        "downloads_remaining": max(quota["downloads_limit"] - quota["downloads_used"], 0),
        "downloads_limit": quota["downloads_limit"],
        "scans_remaining": max(quota["scans_limit"] - quota["scans_used"], 0),
        "scans_limit": quota["scans_limit"],
    }
