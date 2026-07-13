import json

from app.config import settings

# Un palier d'abonnement se ramene a l'un de ces trois groupes de qualite de modele.
TIER_GROUPS = {
    "introduction": "introduction",
    "goutte": "goutte_source",
    "source": "goutte_source",
    "fleuve": "fleuve_ocean",
    "ocean": "fleuve_ocean",
}

# Matrice outil x palier -> liste de modeles OpenRouter candidats (le premier est le choix
# par defaut ; les suivants sont des alternatives a arbitrer apres mesure cout/qualite en
# production). None = outil non disponible a ce palier (403 + invitation a monter de palier).
DEFAULT_ROUTING: dict[str, dict[str, list[str] | None]] = {
    # Redaction courte (satellites) — moteur economique en gratuit, monte en qualite des le
    # premier palier payant.
    "reformulator": {
        "introduction": ["deepseek/deepseek-v4-flash", "google/gemini-2.5-flash-lite"],
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "email_writer": {
        "introduction": ["deepseek/deepseek-v4-flash", "google/gemini-2.5-flash-lite"],
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["x-ai/grok-4.5"],
    },
    "chat": {
        "introduction": ["deepseek/deepseek-v4-flash", "google/gemini-2.5-flash-lite"],
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["x-ai/grok-4.5"],
    },
    "social_posts": {
        "introduction": ["deepseek/deepseek-v4-flash", "google/gemini-2.5-flash-lite"],
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["x-ai/grok-4.5"],
    },
    "speech_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "ai_detector_rewrite": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "plagiarism_correction": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    # Documents avances — jamais disponibles en Introduction.
    "cv_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "cover_letter": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "planner": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.5", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "pro_doc_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.5", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "academic_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.5"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
}


class ModelNotAvailableError(Exception):
    """Leve quand un outil est inconnu, un palier est inconnu, ou l'outil n'est pas
    disponible au palier demande."""


def _load_routing() -> dict[str, dict[str, list[str] | None]]:
    if not settings.LLM_ROUTING_JSON:
        return DEFAULT_ROUTING
    try:
        override = json.loads(settings.LLM_ROUTING_JSON)
    except (json.JSONDecodeError, TypeError):
        return DEFAULT_ROUTING
    return {**DEFAULT_ROUTING, **override}


def resolve_model(tool: str, tier: str) -> str:
    """Renvoie le modele OpenRouter par defaut pour un outil et un palier d'abonnement."""
    routing = _load_routing()

    tool_matrix = routing.get(tool)
    if tool_matrix is None:
        raise ModelNotAvailableError(f"Outil inconnu : {tool}")

    group = TIER_GROUPS.get(tier)
    if group is None:
        raise ModelNotAvailableError(f"Palier inconnu : {tier}")

    candidates = tool_matrix.get(group)
    if not candidates:
        raise ModelNotAvailableError(
            f"L'outil « {tool} » necessite un abonnement a partir du palier Goutte."
        )
    return candidates[0]
