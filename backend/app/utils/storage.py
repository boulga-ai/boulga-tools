from app.db.supabase import get_service_client


def upload_file(bucket: str, path: str, content: bytes, content_type: str) -> None:
    client = get_service_client()
    client.storage.from_(bucket).upload(
        path, content, {"content-type": content_type, "upsert": "true"}
    )


def create_signed_url(bucket: str, path: str, expires_in_seconds: int) -> str:
    client = get_service_client()
    result = client.storage.from_(bucket).create_signed_url(path, expires_in_seconds)
    return result.get("signedURL") or result["signedUrl"]


def delete_file(bucket: str, path: str) -> None:
    client = get_service_client()
    client.storage.from_(bucket).remove([path])


def delete_user_files(user_id: str) -> None:
    """Supprime tous les fichiers d'un utilisateur dans les 3 buckets (suppression de
    compte). Best-effort : un bucket vide ou une erreur de listing n'interrompt pas les
    autres buckets."""
    client = get_service_client()
    for bucket in ("uploads", "generated", "temp"):
        try:
            objects = client.storage.from_(bucket).list(user_id)
            paths = [f"{user_id}/{obj['name']}" for obj in objects if obj.get("name")]
            if paths:
                client.storage.from_(bucket).remove(paths)
        except Exception:
            continue
