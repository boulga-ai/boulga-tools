from datetime import datetime, timezone

from app.db.supabase import get_service_client


def create_session(user_id: str, doc_type: str) -> dict:
    client = get_service_client()
    result = (
        client.table("academic_sessions")
        .insert(
            {
                "user_id": user_id,
                "status": "in_progress",
                "current_step": 1,
                "doc_type": doc_type,
                "sections_json": {},
            }
        )
        .execute()
    )
    return result.data[0]


def list_sessions(user_id: str) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("academic_sessions")
        .select("id, doc_type, domain, topic, status, current_step, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


def get_session(user_id: str, session_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("academic_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def _collect_titles(outline_json: dict | None) -> dict[str, str]:
    titles: dict[str, str] = {}

    def walk(sections: list[dict]) -> None:
        for section in sections:
            titles[section["id"]] = section["title"]
            walk(section.get("children", []))

    if outline_json:
        walk(outline_json.get("sections", []))
    return titles


def _mark_sections_to_review(
    old_outline_json: dict | None, new_outline_json: dict, sections_json: dict
) -> dict:
    """Si le titre d'une section deja generee change (ou que la section disparait du
    plan), son statut passe a 'a_revoir' — le contenu deja redige n'est jamais perdu."""
    old_titles = _collect_titles(old_outline_json)
    new_titles = _collect_titles(new_outline_json)

    updated = dict(sections_json)
    for section_id, section_data in sections_json.items():
        old_title = old_titles.get(section_id)
        new_title = new_titles.get(section_id)
        if old_title is not None and old_title != new_title:
            updated[section_id] = {**section_data, "status": "a_revoir"}
    return updated


def update_session(user_id: str, session_id: str, fields: dict) -> dict | None:
    client = get_service_client()
    fields = dict(fields)

    if "outline_json" in fields:
        current = get_session(user_id, session_id)
        if current and current.get("sections_json"):
            fields["sections_json"] = _mark_sections_to_review(
                current.get("outline_json"), fields["outline_json"], current["sections_json"]
            )

    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        client.table("academic_sessions")
        .update(fields)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None
