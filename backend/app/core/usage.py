from app.db.supabase import get_service_client


def log_usage(
    user_id: str,
    tool: str,
    model: str,
    tokens_in: int,
    tokens_out: int,
    cost_usd: float,
    tier: str,
) -> None:
    """Journalise un appel LLM — source du cout reel par outil (usage_logs)."""
    client = get_service_client()
    client.table("usage_logs").insert(
        {
            "user_id": user_id,
            "tool": tool,
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost_usd": cost_usd,
            "tier": tier,
        }
    ).execute()
