from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import InvalidTokenError, verify_jwt
from app.core.quota import check_quota
from app.db.supabase import get_service_client

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
        )

    try:
        payload = await verify_jwt(credentials.credentials)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expiree, veuillez vous reconnecter.",
        )

    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide.",
        )

    return {"user_id": user_id, "email": email}


def get_profile(user_id: str) -> dict:
    client = get_service_client()
    result = (
        client.table("profiles")
        .select("id, full_name, phone, role, current_tier")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil introuvable.",
        )
    return result.data


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    profile = get_profile(user["user_id"])
    if profile.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reserve aux administrateurs.",
        )
    return user


def check_quota_dep(kind: Literal["words", "downloads"]):
    """Dependance FastAPI : verifie le solde de quota du palier courant avant d'entrer
    dans un endpoint d'outil. Renvoie l'utilisateur enrichi de son palier."""

    async def _dependency(user: dict = Depends(get_current_user)) -> dict:
        profile = get_profile(user["user_id"])
        check_quota(user["user_id"], profile["current_tier"], kind)
        return {**user, "tier": profile["current_tier"]}

    return _dependency
