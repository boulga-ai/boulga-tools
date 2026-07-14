"""Vocabulaire de blocs — la structure que le LLM assemble librement pour produire
un document, plutot qu'un schema a champs figes. Le renderer (V3-5) traduit chaque
type de bloc en style selon le template ; le LLM ne decide jamais du style, seulement
de la composition (quels blocs, dans quel ordre, avec quel contenu)."""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

# --- Socle commun (tous documents) -----------------------------------------------


class HeadingBlock(BaseModel):
    type: Literal["heading"] = "heading"
    level: int = Field(ge=1, le=4)
    text: str
    numbered: bool = False


class ParagraphBlock(BaseModel):
    type: Literal["paragraph"] = "paragraph"
    text: str


class BulletListBlock(BaseModel):
    type: Literal["bullet_list"] = "bullet_list"
    items: list[str]


class NumberedListBlock(BaseModel):
    type: Literal["numbered_list"] = "numbered_list"
    items: list[str]


class TableBlock(BaseModel):
    type: Literal["table"] = "table"
    headers: list[str]
    rows: list[list[str]]
    caption: str | None = None


class QuoteBlock(BaseModel):
    type: Literal["quote"] = "quote"
    text: str


class SpacerBlock(BaseModel):
    type: Literal["spacer"] = "spacer"


class PageBreakBlock(BaseModel):
    type: Literal["page_break"] = "page_break"


# --- Blocs CV ----------------------------------------------------------------------


class ContactBlock(BaseModel):
    type: Literal["contact"] = "contact"
    full_name: str
    title: str = ""
    email: str = ""
    phone: str | None = None
    address: str | None = None
    linkedin: str | None = None


class SummaryBlock(BaseModel):
    type: Literal["summary"] = "summary"
    text: str


class ExperienceBlock(BaseModel):
    type: Literal["experience"] = "experience"
    position: str
    company: str = ""
    start: str = ""
    end: str | None = None
    location: str | None = None
    description: str = ""
    achievements: list[str] = Field(default_factory=list)


class EducationBlock(BaseModel):
    type: Literal["education"] = "education"
    degree: str
    institution: str = ""
    year: str = ""
    location: str | None = None
    details: str | None = None


class SkillGroupBlock(BaseModel):
    type: Literal["skill_group"] = "skill_group"
    label: str = "Compétences"
    skills: list[str]


class LanguageEntry(BaseModel):
    language: str
    level: str = ""


class LanguageGroupBlock(BaseModel):
    type: Literal["language_group"] = "language_group"
    languages: list[LanguageEntry]


# --- Blocs lettre --------------------------------------------------------------------


class LetterHeaderBlock(BaseModel):
    type: Literal["letter_header"] = "letter_header"
    sender_name: str
    sender_contact: list[str] = Field(default_factory=list)
    recipient_name: str | None = None
    recipient_title: str | None = None
    company_name: str | None = None
    place: str | None = None
    date: str = ""


class SubjectBlock(BaseModel):
    type: Literal["subject"] = "subject"
    text: str


class SignatureBlock(BaseModel):
    type: Literal["signature"] = "signature"
    closing: str = "Cordialement,"
    name: str = ""


# --- Blocs pro / academique -----------------------------------------------------------


class CoverPageBlock(BaseModel):
    type: Literal["cover_page"] = "cover_page"
    title: str
    author: str | None = None
    institution: str | None = None
    supervisor: str | None = None
    date: str | None = None
    # Champs libres additionnels (ex: organisation, encadreur secondaire...). Les cles
    # vides ou absentes sont simplement ignorees au rendu — jamais bloquant.
    extra: dict[str, str] = Field(default_factory=dict)


class TableOfContentsBlock(BaseModel):
    type: Literal["table_of_contents"] = "table_of_contents"


class BibliographyBlock(BaseModel):
    type: Literal["bibliography"] = "bibliography"
    entries: list[str] = Field(default_factory=list)


# --- Union discriminee ---------------------------------------------------------------

Block = Annotated[
    Union[
        HeadingBlock,
        ParagraphBlock,
        BulletListBlock,
        NumberedListBlock,
        TableBlock,
        QuoteBlock,
        SpacerBlock,
        PageBreakBlock,
        ContactBlock,
        SummaryBlock,
        ExperienceBlock,
        EducationBlock,
        SkillGroupBlock,
        LanguageGroupBlock,
        LetterHeaderBlock,
        SubjectBlock,
        SignatureBlock,
        CoverPageBlock,
        TableOfContentsBlock,
        BibliographyBlock,
    ],
    Field(discriminator="type"),
]

# Registre nom -> classe, utilise pour la reparation de blocs mal formes (document.py)
# et pour construire le vocabulaire expose au LLM dans les prompts guides (V3-2).
BLOCK_REGISTRY: dict[str, type[BaseModel]] = {
    "heading": HeadingBlock,
    "paragraph": ParagraphBlock,
    "bullet_list": BulletListBlock,
    "numbered_list": NumberedListBlock,
    "table": TableBlock,
    "quote": QuoteBlock,
    "spacer": SpacerBlock,
    "page_break": PageBreakBlock,
    "contact": ContactBlock,
    "summary": SummaryBlock,
    "experience": ExperienceBlock,
    "education": EducationBlock,
    "skill_group": SkillGroupBlock,
    "language_group": LanguageGroupBlock,
    "letter_header": LetterHeaderBlock,
    "subject": SubjectBlock,
    "signature": SignatureBlock,
    "cover_page": CoverPageBlock,
    "table_of_contents": TableOfContentsBlock,
    "bibliography": BibliographyBlock,
}


# --- Vocabulaire par type de document -------------------------------------------------

DOCUMENT_SCHEMAS: dict[str, dict] = {
    "cv": {
        "description": "Un CV professionnel francophone, pour le marche de l'emploi ouest-africain.",
        "blocks": [
            "contact",
            "summary",
            "heading",
            "experience",
            "education",
            "skill_group",
            "language_group",
            "bullet_list",
        ],
        "guidance": (
            "Le premier bloc est toujours contact. Utilise summary pour un resume "
            "percutant de 2-4 lignes. Un bloc experience par poste (le plus recent "
            "en premier), un bloc education par diplome. skill_group peut etre "
            "repete pour grouper les competences par categorie (ex: 'Techniques', "
            "'Outils'). Utilise heading uniquement si tu as besoin d'une section "
            "supplementaire non couverte (ex: 'Projets', 'Certifications')."
        ),
    },
    "cover_letter": {
        "description": "Une lettre de motivation francophone, ton adapte a la demande.",
        "blocks": ["letter_header", "subject", "paragraph", "signature"],
        "guidance": (
            "Le premier bloc est letter_header, puis subject (l'objet de la "
            "lettre), puis 3 a 5 blocs paragraph (accroche, motivation/adequation, "
            "conclusion avec demande d'entretien), puis signature en dernier bloc."
        ),
    },
    "pro_doc": {
        "description": "Un document professionnel (rapport, proposition, business plan, etude de cas...).",
        "blocks": [
            "cover_page",
            "heading",
            "paragraph",
            "bullet_list",
            "numbered_list",
            "table",
            "quote",
            "page_break",
        ],
        "guidance": (
            "cover_page TOUJOURS en premier bloc, quel que soit le type ou la longueur "
            "du document — jamais omise. Renseigne systematiquement title, author, "
            "date et institution des que l'info existe quelque part dans le contexte "
            "ou la conversation ; ne laisse jamais un champ vide si l'info est "
            "disponible. Puis structure avec des heading de niveau 1-3. Utilise table "
            "pour les donnees chiffrees (budgets, indicateurs, comparatifs) et "
            "bullet_list pour les enumerations, sans en abuser : un document sans "
            "aucune donnee tabulaire n'a pas besoin de table."
        ),
    },
    "academic": {
        "description": "Un document academique francophone (rapport de stage, memoire, these).",
        "blocks": [
            "cover_page",
            "table_of_contents",
            "heading",
            "paragraph",
            "bullet_list",
            "numbered_list",
            "table",
            "quote",
            "page_break",
            "bibliography",
        ],
        "guidance": (
            "cover_page TOUJOURS en premier bloc — renseigne systematiquement title, "
            "author, date et institution des que l'info existe quelque part dans le "
            "contexte ou la conversation ; ne laisse jamais un champ vide si l'info "
            "est disponible. Puis table_of_contents, puis les chapitres/sections avec "
            "heading (niveau 1 pour les parties, 2-3 pour les sous-parties). Style "
            "academique, impersonnel. table pour les donnees d'enquete ou de "
            "comparaison, bullet_list pour les enumerations. bibliography en dernier "
            "bloc si des sources sont mentionnees dans le texte — sinon omets-le."
        ),
    },
}
