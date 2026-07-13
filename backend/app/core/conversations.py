from datetime import datetime, timezone

from app.db.supabase import get_service_client


def save_conversation(user_id: str, tool: str, title: str, messages: list[dict]) -> dict:
    client = get_service_client()
    result = (
        client.table("conversations")
        .insert(
            {
                "user_id": user_id,
                "tool": tool,
                "title": title[:120],
                "messages_json": messages,
            }
        )
        .execute()
    )
    return result.data[0]


def list_conversations(user_id: str, tool: str) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user_id)
        .eq("tool", tool)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def get_conversation(user_id: str, tool: str, conversation_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("conversations")
        .select("*")
        .eq("user_id", user_id)
        .eq("tool", tool)
        .eq("id", conversation_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def delete_conversation(user_id: str, tool: str, conversation_id: str) -> None:
    client = get_service_client()
    client.table("conversations").delete().eq("user_id", user_id).eq("tool", tool).eq(
        "id", conversation_id
    ).execute()


def update_conversation_messages(conversation_id: str, messages: list[dict]) -> None:
    client = get_service_client()
    client.table("conversations").update(
        {
            "messages_json": messages,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", conversation_id).execute()
