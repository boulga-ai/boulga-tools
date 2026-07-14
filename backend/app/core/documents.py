from app.db.supabase import get_service_client


def insert_document_draft(document_id: str, user_id: str, tool: str, title: str, content_json: dict) -> dict:
    """Insere un document juste apres generation (moteur V3) : seul le JSON de blocs
    est connu, aucun fichier n'a encore ete rendu. storage_path/template/format sont
    remplis plus tard par finalize_document_render, au moment du telechargement."""
    client = get_service_client()
    result = (
        client.table("documents")
        .insert(
            {
                "id": document_id,
                "user_id": user_id,
                "tool": tool,
                "title": title,
                "content_json": content_json,
            }
        )
        .execute()
    )
    return result.data[0]


def finalize_document_render(
    document_id: str,
    user_id: str,
    template: str,
    doc_format: str,
    storage_path: str,
    title: str | None = None,
) -> dict | None:
    """Complete un document deja insere (draft) avec le resultat de son dernier rendu.
    Un nouveau telechargement dans un autre template/format met simplement a jour ces
    champs — le contenu (content_json) ne change jamais a ce stade. title est mis a
    jour uniquement si fourni (le user a pu le modifier apres generation)."""
    client = get_service_client()
    fields = {"template": template, "format": doc_format, "storage_path": storage_path}
    if title:
        fields["title"] = title
    result = (
        client.table("documents")
        .update(fields)
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def list_documents(user_id: str, tool: str | None = None) -> list[dict]:
    client = get_service_client()
    query = (
        client.table("documents")
        .select("id, tool, title, template, format, created_at")
        .eq("user_id", user_id)
    )
    if tool:
        query = query.eq("tool", tool)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


def get_latest_document_by_tool(tool: str, user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("documents")
        .select("id, tool, title, content_json, created_at")
        .eq("user_id", user_id)
        .eq("tool", tool)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_document(document_id: str, user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("documents")
        .select("id, tool, title, template, format, storage_path, content_json")
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
