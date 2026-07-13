import json

from app.core.document_engine.schema import Outline

DOC_TYPE_LABELS: dict[str, str] = {
    "rapport_stage": "rapport de stage",
    "memoire": "memoire",
    "these": "these",
}

TARGET_WORDS_BY_TYPE: dict[str, int] = {
    "rapport_stage": 300,
    "memoire": 500,
    "these": 700,
}

SUGGEST_TOPICS_PROMPT = (
    "Propose 5 sujets de {doc_type} originaux pour un etudiant en {domain} en Afrique de "
    "l'Ouest francophone. Pour chaque : titre, problematique, 3 mots-cles. Reponds "
    "UNIQUEMENT en JSON strictement valide, sans texte autour, sous la forme : "
    '[{{"title": "...", "problematic": "...", "keywords": ["...", "...", "..."]}}]'
)

GENERATE_OUTLINE_PROMPT = (
    "Genere un plan detaille pour un {doc_type} sur : {topic}. Respecte les conventions "
    "academiques francaises. Chaque section a un id unique (ex: '1', '1.1'), un titre, "
    "un niveau (1, 2 ou 3), des sous-sections (children) le cas echeant. Reponds "
    "UNIQUEMENT en JSON strictement valide conforme au schema suivant, sans aucun texte "
    "avant ou apres : {schema}"
)

GENERATE_SECTION_PROMPT = (
    'Tu rediges la section "{section_title}" d\'un {doc_type} academique. Contexte : '
    "sujet {topic}, domaine {domain}. Plan complet : {outline}. Resumes des sections "
    "precedentes deja redigees : {previous_summaries}. Consignes : style academique "
    "francais, impersonnel, {target_words} mots environ, sous-titres si section longue, "
    "cite des sources (Auteur, Annee) de maniere plausible. Redige le contenu en markdown "
    "leger (pas de JSON, texte direct)."
)

SUMMARIZE_SECTION_PROMPT = "Resume en 2 a 3 phrases le texte suivant :\n\n{content}"


def build_suggest_topics_message(doc_type: str, domain: str) -> str:
    return SUGGEST_TOPICS_PROMPT.format(doc_type=DOC_TYPE_LABELS.get(doc_type, doc_type), domain=domain)


def build_outline_message(doc_type: str, topic: str) -> str:
    return GENERATE_OUTLINE_PROMPT.format(
        doc_type=DOC_TYPE_LABELS.get(doc_type, doc_type),
        topic=topic,
        schema=json.dumps(Outline.model_json_schema()),
    )


def build_section_message(
    section_title: str,
    doc_type: str,
    topic: str,
    domain: str,
    outline_summary: str,
    previous_summaries: str,
) -> str:
    target_words = TARGET_WORDS_BY_TYPE.get(doc_type, 400)
    return GENERATE_SECTION_PROMPT.format(
        section_title=section_title,
        doc_type=DOC_TYPE_LABELS.get(doc_type, doc_type),
        topic=topic,
        domain=domain,
        outline=outline_summary,
        previous_summaries=previous_summaries or "(aucune section validee pour le moment)",
        target_words=target_words,
    )


def build_summarize_message(content: str) -> str:
    return SUMMARIZE_SECTION_PROMPT.format(content=content[:4000])
