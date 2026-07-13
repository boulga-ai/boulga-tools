from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache
def get_service_client() -> Client:
    """Client Supabase avec la cle service_role — acces privilegie, cote serveur uniquement."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
