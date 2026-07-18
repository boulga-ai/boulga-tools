from app.db.supabase import get_service_client


def save_generation(user_id: str, tool: str, content: str, metadata: dict) -> dict:
    client = get_service_client()
    result = (
        client.table("saved_generations")
        .insert({"user_id": user_id, "tool": tool, "content": content, "metadata": metadata})
        .execute()
    )
    return result.data[0]


def list_generations(user_id: str, tool: str) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("saved_generations")
        .select("id, content, metadata, created_at")
        .eq("user_id", user_id)
        .eq("tool", tool)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []
