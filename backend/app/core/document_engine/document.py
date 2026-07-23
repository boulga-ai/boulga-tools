"""Document = un doc_type + des metadonnees + une liste de blocs valides. Validation
et reparation vivent ici pour qu'une sortie LLM imparfaite ne casse jamais la
generation : un bloc mal forme est repare a la marge ou ignore proprement, jamais
une exception qui interrompt tout le document."""

import logging

from pydantic import BaseModel, Field, ValidationError

from app.core.document_engine.blocks import BLOCK_REGISTRY, DOCUMENT_SCHEMAS, Block, effective_schema

logger = logging.getLogger(__name__)


class Document(BaseModel):
    doc_type: str
    meta: dict = Field(default_factory=dict)
    blocks: list[Block] = Field(default_factory=list)


def _allowed_block_types(doc_type: str, template: str | None = None) -> set[str]:
    if doc_type not in DOCUMENT_SCHEMAS:
        return set(BLOCK_REGISTRY.keys())
    return set(effective_schema(doc_type, template)["blocks"])


def repair_block(raw: dict) -> Block | None:
    """Construit un bloc a partir d'un dict brut issu du LLM. Si des champs texte/liste
    requis manquent, comble avec des valeurs vides plutot que d'echouer. Si un champ
    optionnel de type dict/liste est present mais du mauvais type (le LLM envoie parfois
    une chaine libre la ou un dict structure est attendu — vu en prod sur
    CoverPageBlock.extra), reinitialise ce champ a une valeur par defaut plutot que de
    faire echouer tout le bloc pour un champ secondaire. Si le type est inconnu ou la
    structure irrecuperable malgre ca, renvoie None — le bloc est alors ignore."""
    if not isinstance(raw, dict):
        return None
    model_cls = BLOCK_REGISTRY.get(raw.get("type"))
    if model_cls is None:
        return None

    try:
        return model_cls.model_validate(raw)
    except ValidationError:
        repaired = dict(raw)
        for field_name, field in model_cls.model_fields.items():
            origin = getattr(field.annotation, "__origin__", None)
            if field_name not in repaired:
                if not field.is_required():
                    continue
                if field.annotation is str:
                    repaired[field_name] = ""
                elif origin is list:
                    repaired[field_name] = []
                continue
            value = repaired[field_name]
            if origin is dict and not isinstance(value, dict):
                repaired[field_name] = {}
            elif origin is list and not isinstance(value, list):
                repaired[field_name] = []
        try:
            return model_cls.model_validate(repaired)
        except ValidationError as exc:
            logger.warning("Bloc irrecuperable ignore (type=%s) : %s", raw.get("type"), exc)
            return None


def validate_document(doc_type: str, data: dict, template: str | None = None) -> Document:
    """Valide un document complet : ne garde que les blocs conformes au vocabulaire du
    doc_type (eventuellement elargi par le contrat du template, pour cv/cover_letter).
    Les blocs hors-vocabulaire ou irrecuperables sont silencieusement ecartes — jamais
    d'exception qui bloque la generation."""
    allowed = _allowed_block_types(doc_type, template)
    blocks: list[Block] = []
    for raw in data.get("blocks") or []:
        block = repair_block(raw)
        if block is not None and block.type in allowed:
            blocks.append(block)
    return Document(doc_type=doc_type, meta=data.get("meta") or {}, blocks=blocks)


def blocks_from_raw(doc_type: str, raw_blocks: list[dict], template: str | None = None) -> list[Block]:
    """Meme logique de reparation/filtrage que validate_document, pour une liste de
    blocs deja parses individuellement (utilise par le streaming JSONL, V3-2/V3-3)."""
    allowed = _allowed_block_types(doc_type, template)
    blocks: list[Block] = []
    for raw in raw_blocks:
        block = repair_block(raw)
        if block is not None and block.type in allowed:
            blocks.append(block)
    return blocks


# Photo/logo uploade par le user (bucket Storage "uploads") : jamais renseignee par
# le LLM lui-meme (aucun acces a un fichier reel) — rattachee au bloc pertinent APRES
# generation (set_photo_path, documents_engine.py) et relue au moment du rendu
# .docx (get_photo_path, documents.py) pour telecharger les octets. cover_letter n'a
# volontairement pas d'entree : pas de bloc contact ni cover_page dans son vocabulaire.
PHOTO_BLOCK_TYPE: dict[str, str] = {"cv": "contact", "pro_doc": "cover_page", "academic": "cover_page"}


def set_photo_path(doc_type: str, document: Document, photo_path: str | None) -> None:
    """Mute le document en place. Sans effet si photo_path est vide ou si doc_type
    n'a pas de bloc pertinent."""
    target_type = PHOTO_BLOCK_TYPE.get(doc_type)
    if not photo_path or target_type is None:
        return
    for block in document.blocks:
        if block.type == target_type:
            block.photo_path = photo_path
            return


def get_photo_path(doc_type: str, document: Document) -> str | None:
    target_type = PHOTO_BLOCK_TYPE.get(doc_type)
    if target_type is None:
        return None
    for block in document.blocks:
        if block.type == target_type:
            return getattr(block, "photo_path", None)
    return None
