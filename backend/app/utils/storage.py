# app/utils/storage.py
from app.db.supabase import get_service_client


def upload_file(bucket: str, path: str, content: bytes, content_type: str) -> None:
    client = get_service_client()
    client.storage.from_(bucket).upload(
        path, content, {"content-type": content_type, "upsert": "true"}
    )


def download_file(bucket: str, path: str) -> bytes:
    client = get_service_client()
    return client.storage.from_(bucket).download(path)


def create_signed_url(
    bucket: str, path: str, expires_in_seconds: int, download_filename: str | None = None
) -> str:
    """download_filename : force un Content-Disposition cote serveur Supabase avec ce nom.
    Necessaire car l'attribut HTML download="..." n'est pas fiable pour une URL cross-origin
    (le navigateur peut l'ignorer et nommer le fichier telecharge d'apres le chemin de l'URL)."""
    client = get_service_client()
    options = {"download": download_filename} if download_filename else None
    result = client.storage.from_(bucket).create_signed_url(path, expires_in_seconds, options)
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
