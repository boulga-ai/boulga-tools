from datetime import datetime, timedelta, timezone

from app.core.quota import TIER_LIMITS, _current_period
from app.db.supabase import get_service_client

# Outils dont le moteur est Claude (documents avances) — vs le reste (rest de la matrice
# multi-fournisseurs : DeepSeek, Grok, Gemini). Utile pour visualiser le cout du "haut de
# gamme" documentaire face aux satellites de redaction courante.
CLAUDE_MODEL_PREFIX = "anthropic/"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def get_kpis() -> dict:
    client = get_service_client()
    now = datetime.now(timezone.utc)

    profiles = client.table("profiles").select("id, current_tier, created_at").execute().data or []
    total_users = len(profiles)
    new_7d = sum(1 for p in profiles if datetime.fromisoformat(p["created_at"]) > now - timedelta(days=7))
    new_30d = sum(1 for p in profiles if datetime.fromisoformat(p["created_at"]) > now - timedelta(days=30))
    tier_breakdown: dict[str, int] = {}
    for p in profiles:
        tier_breakdown[p["current_tier"]] = tier_breakdown.get(p["current_tier"], 0) + 1

    since_30d = _iso(now - timedelta(days=30))
    logs = (
        client.table("usage_logs")
        .select("tool, model, cost_usd, tokens_in, tokens_out, created_at")
        .gte("created_at", since_30d)
        .execute()
        .data
        or []
    )

    since_day = now - timedelta(days=1)
    since_week = now - timedelta(days=7)
    cost_day = sum(l["cost_usd"] for l in logs if datetime.fromisoformat(l["created_at"]) > since_day)
    cost_week = sum(l["cost_usd"] for l in logs if datetime.fromisoformat(l["created_at"]) > since_week)
    cost_month = sum(l["cost_usd"] for l in logs)

    cost_by_tool: dict[str, float] = {}
    cost_claude = 0.0
    cost_other = 0.0
    for log in logs:
        cost_by_tool[log["tool"]] = cost_by_tool.get(log["tool"], 0.0) + log["cost_usd"]
        if log["model"].startswith(CLAUDE_MODEL_PREFIX):
            cost_claude += log["cost_usd"]
        else:
            cost_other += log["cost_usd"]

    avg_cost = cost_month / len(logs) if logs else 0.0

    words_generated = sum((l["tokens_out"] or 0) for l in logs)  # approximation (tokens != mots)
    documents = client.table("documents").select("id, created_at").gte("created_at", since_30d).execute().data or []

    return {
        "users": {
            "total": total_users,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "by_tier": tier_breakdown,
        },
        "costs": {
            "today_usd": round(cost_day, 4),
            "week_usd": round(cost_week, 4),
            "month_usd": round(cost_month, 4),
            "avg_per_generation_usd": round(avg_cost, 6),
            "by_tool": {k: round(v, 4) for k, v in cost_by_tool.items()},
            "claude_usd": round(cost_claude, 4),
            "other_models_usd": round(cost_other, 4),
        },
        "volumes": {
            "generations_30d": len(logs),
            "words_generated_30d": words_generated,
            "documents_downloaded_30d": len(documents),
        },
    }


def list_users(search: str | None, page: int, per_page: int) -> dict:
    client = get_service_client()
    query = client.table("profiles").select(
        "id, full_name, phone, current_tier, role, created_at", count="exact"
    )
    if search:
        query = query.ilike("full_name", f"%{search}%")

    start = (page - 1) * per_page
    end = start + per_page - 1
    result = query.order("created_at", desc=True).range(start, end).execute()
    return {"items": result.data or [], "total": result.count or 0, "page": page, "per_page": per_page}


def get_user_detail(user_id: str) -> dict | None:
    client = get_service_client()
    profile_result = client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not profile_result or not profile_result.data:
        return None

    quota_result = (
        client.table("quotas")
        .select("*")
        .eq("user_id", user_id)
        .eq("period", _current_period())
        .maybe_single()
        .execute()
    )
    usage_result = (
        client.table("usage_logs")
        .select("tool, model, cost_usd, tokens_in, tokens_out, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {
        "profile": profile_result.data,
        "quota": quota_result.data if quota_result else None,
        "recent_usage": usage_result.data or [],
    }


def set_user_tier(user_id: str, tier: str) -> None:
    client = get_service_client()
    client.table("profiles").update({"current_tier": tier}).eq("id", user_id).execute()

    limits = TIER_LIMITS.get(tier, TIER_LIMITS["introduction"])
    period = _current_period()
    existing = (
        client.table("quotas")
        .select("id")
        .eq("user_id", user_id)
        .eq("period", period)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        client.table("quotas").update(
            {"words_limit": limits["words"], "downloads_limit": limits["downloads"]}
        ).eq("id", existing.data["id"]).execute()
    else:
        client.table("quotas").insert(
            {
                "user_id": user_id,
                "period": period,
                "words_used": 0,
                "words_limit": limits["words"],
                "downloads_used": 0,
                "downloads_limit": limits["downloads"],
            }
        ).execute()


def reset_user_quota(user_id: str) -> None:
    client = get_service_client()
    client.table("quotas").update({"words_used": 0, "downloads_used": 0}).eq(
        "user_id", user_id
    ).eq("period", _current_period()).execute()


def get_costs(period: str) -> list[dict]:
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    since = _iso(datetime.now(timezone.utc) - timedelta(days=days))

    client = get_service_client()
    logs = (
        client.table("usage_logs")
        .select("tool, tier, model, cost_usd, tokens_in, tokens_out")
        .gte("created_at", since)
        .execute()
        .data
        or []
    )

    grouped: dict[tuple[str, str, str], dict] = {}
    for log in logs:
        key = (log["tool"], log["tier"], log["model"])
        row = grouped.setdefault(
            key, {"tool": log["tool"], "tier": log["tier"], "model": log["model"],
                  "count": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0}
        )
        row["count"] += 1
        row["tokens_in"] += log["tokens_in"] or 0
        row["tokens_out"] += log["tokens_out"] or 0
        row["cost_usd"] += log["cost_usd"] or 0.0

    rows = list(grouped.values())
    for row in rows:
        row["cost_usd"] = round(row["cost_usd"], 6)
        row["avg_cost_usd"] = round(row["cost_usd"] / row["count"], 6) if row["count"] else 0.0
    rows.sort(key=lambda r: r["cost_usd"], reverse=True)
    return rows
