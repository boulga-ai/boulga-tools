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
    # Redaction courte (satellites) — reformulator/email_writer/social_posts/speech_writer
    # tournent sur OpenAI des le premier palier payant (petit modele en goutte/source,
    # grand modele en fleuve/ocean) ; le palier gratuit reste sur Grok et/ou DeepSeek,
    # moins chers, compenses par un prompt resserre (voir prompts/*.py).
    "reformulator": {
        "introduction": ["x-ai/grok-4.3", "deepseek/deepseek-v4-flash"],
        "goutte_source": ["openai/gpt-5.1-mini"],
        "fleuve_ocean": ["openai/gpt-5.1"],
    },
    "email_writer": {
        "introduction": ["x-ai/grok-4.3", "deepseek/deepseek-v4-flash"],
        "goutte_source": ["openai/gpt-5.1-mini"],
        "fleuve_ocean": ["openai/gpt-5.1"],
    },
    "chat": {
        "introduction": ["deepseek/deepseek-v4-flash", "google/gemini-2.5-flash-lite"],
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    "social_posts": {
        "introduction": ["x-ai/grok-4.3", "deepseek/deepseek-v4-flash"],
        "goutte_source": ["openai/gpt-5.1-mini"],
        "fleuve_ocean": ["openai/gpt-5.1"],
    },
    "speech_writer": {
        "introduction": None,
        "goutte_source": ["openai/gpt-5.1-mini"],
        "fleuve_ocean": ["openai/gpt-5.1"],
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
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6"],
    },
    # 2 candidats par groupe : [0] = competence "standard", [1] = competence
    # "expert" (voir resolve_model). Expert appelle un modele sensiblement plus
    # cher (Opus a fleuve_ocean) — choix economique du user, pas neutre en cout.
    "pro_doc_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6", "anthropic/claude-opus-4.6"],
    },
    "academic_writer": {
        "introduction": None,
        "goutte_source": ["x-ai/grok-4.3", "google/gemini-3.5-flash"],
        "fleuve_ocean": ["anthropic/claude-sonnet-4.6", "anthropic/claude-opus-4.6"],
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


def resolve_model(tool: str, tier: str, competence: str = "standard") -> str:
    """Renvoie le modele OpenRouter pour un outil et un palier d'abonnement.

    competence="standard" (defaut) -> candidates[0], comportement inchange.
    competence="expert" -> candidates[1] si ce 2e candidat existe pour ce
    palier, sinon retombe silencieusement sur candidates[0] — un palier qui
    n'offre qu'un seul modele ne doit jamais bloquer sur un choix impossible.
    Le nom du modele n'est jamais expose au user ; "competence" est le seul
    vocabulaire cote produit (voir DOCUMENT_SCHEMAS / documents_engine.py)."""
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
    if competence == "expert" and len(candidates) > 1:
        return candidates[1]
    return candidates[0]
