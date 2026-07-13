import time
from collections import defaultdict

from fastapi import Depends, HTTPException, status

from app.dependencies import get_current_user

_WINDOW_SECONDS = 60
_MAX_CALLS_PER_WINDOW = 10
_calls: dict[str, list[float]] = defaultdict(list)


async def rate_limit_dep(user: dict = Depends(get_current_user)) -> dict:
    """Limite basique en memoire process : 10 appels/minute par utilisateur sur les
    endpoints LLM, pour se proteger d'un abus du quota gratuit (V1 : pas de Redis)."""
    now = time.time()
    user_id = user["user_id"]

    recent = [t for t in _calls[user_id] if now - t < _WINDOW_SECONDS]
    if len(recent) >= _MAX_CALLS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de requetes. Veuillez patienter quelques instants.",
        )

    recent.append(now)
    _calls[user_id] = recent
    return user
