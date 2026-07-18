# backend/app/core/quota.py
from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException, status

from app.db.supabase import get_service_client

TIER_LIMITS: dict[str, dict[str, int]] = {
    "introduction": {"words": 5000, "downloads": 0, "scans": 5},
    "goutte": {"words": 40000, "downloads": 10, "scans": 15},
    "source": {"words": 120000, "downloads": 30, "scans": 40},
    "fleuve": {"words": 300000, "downloads": 80, "scans": 80},
    "ocean": {
        "words": 999_999_999,
        "downloads": 999_999_999,
        "scans": 999_999_999,
    },  # illimite (fair-use)
}


def _current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_quota_history(user_id: str, months: int = 6) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("quotas")
        .select("period, words_used, words_limit, downloads_used, downloads_limit")
        .eq("user_id", user_id)
        .order("period", desc=True)
        .limit(months)
        .execute()
    )
    return result.data or []


def get_or_create_quota(user_id: str, tier: str) -> dict:
    """Recupere la ligne quotas du mois courant, la cree a la volee si absente avec les
    limites du palier passe en parametre."""
    client = get_service_client()
    period = _current_period()

    result = (
        client.table("quotas")
        .select("*")
        .eq("user_id", user_id)
        .eq("period", period)
        .maybe_single()
        .execute()
    )
    if result and result.data:
        return result.data

    limits = TIER_LIMITS.get(tier, TIER_LIMITS["introduction"])
    insert_result = (
        client.table("quotas")
        .insert(
            {
                "user_id": user_id,
                "period": period,
                "words_used": 0,
                "words_limit": limits["words"],
                "downloads_used": 0,
                "downloads_limit": limits["downloads"],
                "scans_used": 0,
                "scans_limit": limits["scans"],
            }
        )
        .execute()
    )
    return insert_result.data[0]


def check_quota(user_id: str, tier: str, kind: Literal["words", "downloads", "scans"]) -> None:
    """Verifie le solde avant generation. Insuffisant -> 402 avec message d'upgrade."""
    quota = get_or_create_quota(user_id, tier)
    used = quota[f"{kind}_used"]
    limit = quota[f"{kind}_limit"]

    if used >= limit:
        label = {"words": "de mots", "downloads": "de téléchargements", "scans": "de scans"}[kind]
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Vous avez utilisé tout votre quota {label} disponible ce mois-ci. "
                "Passez au palier supérieur pour continuer."
            ),
        )


def consume_words(user_id: str, n: int) -> None:
    """Decrement atomique du quota mots, en fin de generation (tokens reels connus)."""
    if n <= 0:
        return
    client = get_service_client()
    client.rpc(
        "increment_quota_usage",
        {
            "p_user_id": user_id,
            "p_period": _current_period(),
            "p_words": n,
            "p_downloads": 0,
        },
    ).execute()


def consume_download(user_id: str) -> None:
    """Decrement atomique du quota telechargements, au moment ou le fichier est servi."""
    client = get_service_client()
    client.rpc(
        "increment_quota_usage",
        {
            "p_user_id": user_id,
            "p_period": _current_period(),
            "p_words": 0,
            "p_downloads": 1,
        },
    ).execute()


def consume_scan(user_id: str) -> None:
    """Decrement atomique du quota scans, apres un appel de detection reussi."""
    client = get_service_client()
    client.rpc(
        "increment_quota_usage",
        {
            "p_user_id": user_id,
            "p_period": _current_period(),
            "p_words": 0,
            "p_downloads": 0,
            "p_scans": 1,
        },
    ).execute()
