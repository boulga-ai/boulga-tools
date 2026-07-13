import json

from app.core.document_engine.schema import CVContent

ANALYZE_PROMPT = (
    "Tu es un expert en recrutement francophone. Analyse les informations du candidat, "
    "identifie les manques, propose des suggestions (reformulation d'intitule, competences "
    "oubliees). Reponds en JSON strictement valide, sans texte autour : "
    '{"completeness_score": <0-100>, "missing_fields": [...], "suggestions": {...}, '
    '"recommended_skills": [...]}'
)

GENERATE_PROMPT = (
    "Tu es un expert en redaction de CV francophones. Genere un CV complet et optimise. "
    "Resume de 3 a 4 lignes percutant. Experiences avec realisations chiffrees quand "
    "possible. Reponds UNIQUEMENT en JSON strictement valide conforme au schema suivant, "
    "sans aucun texte avant ou apres : {schema}"
)


def build_generate_prompt() -> str:
    return GENERATE_PROMPT.format(schema=json.dumps(CVContent.model_json_schema()))


def build_analyze_user_message(form_data: dict) -> str:
    return "Informations fournies par le candidat :\n" + json.dumps(form_data, ensure_ascii=False, indent=2)


def build_generate_user_message(form_data: dict) -> str:
    return "Genere le CV a partir de ces informations :\n" + json.dumps(
        form_data, ensure_ascii=False, indent=2
    )
