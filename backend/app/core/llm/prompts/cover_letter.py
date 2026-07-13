import json

from app.core.document_engine.schema import CoverLetterContent

ANALYZE_PROMPT = (
    "Tu es un expert en recrutement francophone. Analyse les informations fournies pour "
    "une lettre de motivation, identifie ce qui manque, propose des suggestions concretes "
    "(accroche, points forts a mettre en avant selon le poste). Reponds en JSON strictement "
    'valide, sans texte autour : {"completeness_score": <0-100>, "missing_fields": [...], '
    '"suggestions": {...}}'
)

GENERATE_PROMPT = (
    "Tu es un expert en redaction de lettres de motivation francophones. Structure : "
    "accroche et pourquoi cette entreprise, parcours et competences, adequation au poste, "
    "conclusion avec demande d'entretien. Ton adapte a la demande. Reponds UNIQUEMENT en "
    "JSON strictement valide conforme au schema suivant, sans aucun texte avant ou apres : "
    "{schema}"
)


def build_generate_prompt() -> str:
    return GENERATE_PROMPT.format(schema=json.dumps(CoverLetterContent.model_json_schema()))


def build_analyze_user_message(form_data: dict) -> str:
    return "Informations fournies par le candidat :\n" + json.dumps(form_data, ensure_ascii=False, indent=2)


def build_generate_user_message(form_data: dict) -> str:
    return "Genere la lettre de motivation a partir de ces informations :\n" + json.dumps(
        form_data, ensure_ascii=False, indent=2
    )
