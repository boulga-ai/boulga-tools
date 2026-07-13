import json

from app.core.document_engine.schema import ProDocContent

ANALYZE_PROMPT = (
    "Tu es un expert en redaction de documents professionnels francophones. Analyse les "
    "informations fournies, identifie ce qui manque pour produire un document complet et "
    "credible, propose des suggestions concretes. Reponds en JSON strictement valide, sans "
    'texte autour : {"completeness_score": <0-100>, "missing_fields": [...], '
    '"suggestions": {...}}'
)

GENERATE_PROMPT = (
    "Tu es un expert en redaction de documents professionnels francophones (rapports, "
    "propositions, business plans, etudes de cas). Le plan fourni est le squelette : "
    "respecte ses sections et sous-sections. Redige un contenu complet, structure et "
    "professionnel pour chacune. Reponds UNIQUEMENT en JSON strictement valide conforme "
    "au schema suivant, sans aucun texte avant ou apres : {schema}"
)


def build_generate_prompt() -> str:
    return GENERATE_PROMPT.format(schema=json.dumps(ProDocContent.model_json_schema()))


def build_analyze_user_message(form_data: dict) -> str:
    return "Informations fournies :\n" + json.dumps(form_data, ensure_ascii=False, indent=2)


def build_generate_user_message(form_data: dict) -> str:
    return "Genere le document a partir de ces informations et de ce plan :\n" + json.dumps(
        form_data, ensure_ascii=False, indent=2
    )
