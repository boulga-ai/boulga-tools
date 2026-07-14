import json

from app.core.document_engine.schema import Outline

DOC_TYPE_LABELS: dict[str, str] = {
    "rapport_stage": "rapport de stage",
    "memoire": "mémoire",
    "these": "thèse",
    "rapport": "rapport d'activité",
    "note": "note de service",
    "proposition": "proposition commerciale",
    "business_plan": "business plan",
    "etude_de_cas": "étude de cas",
    "analyse_swot": "analyse SWOT",
    "cahier_charges": "cahier des charges",
}

DEPTH_GUIDANCE: dict[str, str] = {
    "essentiel": "Plan simple, 3 à 4 parties principales, pas de sous-parties.",
    "detaille": "Plan avec parties et sous-parties (2 niveaux), 5 à 8 sections principales.",
    "tres_detaille": (
        "Plan complet avec chapitres, sections et sous-sections (3 niveaux), 8 à 12 "
        "sections principales."
    ),
}

SYSTEM_PROMPT = (
    "Tu es un assistant professionnel francophone spécialisé en structuration de documents. "
    "Tu rédiges exclusivement en français. Génère un plan hiérarchique adapté au type de "
    "document et à la profondeur demandée. Chaque section a un id unique (ex : '1', '1.1', "
    "'1.2', '2'), un titre clair, un niveau (1, 2 ou 3), et des sous-sections (children) le "
    "cas échéant.\n\n"
    "Réponds UNIQUEMENT en JSON strictement valide conforme au schéma suivant, sans aucun "
    "texte avant ou après : {schema}"
)


def build_system_prompt() -> str:
    return SYSTEM_PROMPT.format(schema=json.dumps(Outline.model_json_schema()))


def build_user_message(subject: str, doc_type: str, depth: str) -> str:
    type_label = DOC_TYPE_LABELS.get(doc_type, doc_type)
    depth_text = DEPTH_GUIDANCE.get(depth, DEPTH_GUIDANCE["detaille"])
    return f"Sujet : {subject}\nType de document : {type_label}\nProfondeur : {depth_text}"
