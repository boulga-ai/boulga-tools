from app.db.supabase import get_service_client


def insert_document(
    document_id: str,
    user_id: str,
    tool: str,
    title: str,
    template: str,
    doc_format: str,
    storage_path: str,
    content_json: dict,
) -> dict:
    client = get_service_client()
    result = (
        client.table("documents")
        .insert(
            {
                "id": document_id,
                "user_id": user_id,
                "tool": tool,
                "title": title,
                "template": template,
                "format": doc_format,
                "storage_path": storage_path,
                "content_json": content_json,
            }
        )
        .execute()
    )
    return result.data[0]


def list_documents(user_id: str) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("documents")
        .select("id, tool, title, template, format, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_document(document_id: str, user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("documents")
        .select("tool, title, template, format, storage_path, content_json")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def delete_document(document_id: str, user_id: str) -> bool:
    client = get_service_client()
    result = (
        client.table("documents")
        .delete()
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
