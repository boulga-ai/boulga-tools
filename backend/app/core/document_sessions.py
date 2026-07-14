from datetime import datetime, timezone

from app.db.supabase import get_service_client


def create_session(user_id: str, tool: str, doc_type: str) -> dict:
    client = get_service_client()
    result = (
        client.table("document_sessions")
        .insert({"user_id": user_id, "tool": tool, "status": "in_progress", "doc_type": doc_type, "work_state": {}})
        .execute()
    )
    return result.data[0]


def list_sessions(user_id: str, tool: str) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("document_sessions")
        .select("id, doc_type, title, status, updated_at")
        .eq("user_id", user_id)
        .eq("tool", tool)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def get_session(user_id: str, tool: str, session_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("document_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .eq("tool", tool)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def update_session(user_id: str, tool: str, session_id: str, fields: dict) -> dict | None:
    client = get_service_client()
    fields = dict(fields)
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        client.table("document_sessions")
        .update(fields)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .eq("tool", tool)
        .execute()
    )
    return result.data[0] if result.data else None
