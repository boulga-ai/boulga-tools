import time

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.config import settings

_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}


class InvalidTokenError(Exception):
    pass


async def _fetch_jwks() -> list[dict]:
    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url)
            response.raise_for_status()
        return response.json().get("keys", [])
    except httpx.HTTPError as exc:
        raise InvalidTokenError("Impossible de verifier la session (JWKS injoignable)") from exc


async def _get_jwks(force_refresh: bool = False) -> list[dict]:
    now = time.time()
    stale = _jwks_cache["keys"] is None or (now - _jwks_cache["fetched_at"]) > _JWKS_TTL_SECONDS
    if stale or force_refresh:
        _jwks_cache["keys"] = await _fetch_jwks()
        _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


async def verify_jwt(token: str) -> dict:
    """Verifie la signature d'un JWT Supabase (JWKS du projet, cache 1h) et renvoie son payload."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise InvalidTokenError("En-tete de token invalide") from exc

    kid = unverified_header.get("kid")

    keys = await _get_jwks()
    key = next((k for k in keys if k.get("kid") == kid), None)
    if key is None:
        # La cle n'est pas (encore) dans le cache : rotation possible -> on force un refresh
        keys = await _get_jwks(force_refresh=True)
        key = next((k for k in keys if k.get("kid") == kid), None)

    if key is not None:
        try:
            return jwt.decode(
                token,
                key,
                algorithms=[key.get("alg", "ES256")],
                audience="authenticated",
            )
        except JWTError as exc:
            raise InvalidTokenError("Signature ou claims invalides") from exc

    # Projets Supabase "legacy" : JWT signes HS256 avec le secret partage plutot que via JWKS
    if settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as exc:
            raise InvalidTokenError("Signature ou claims invalides") from exc

    raise InvalidTokenError("Cle de signature inconnue")
