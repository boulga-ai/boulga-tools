"""Document = un doc_type + des metadonnees + une liste de blocs valides. Validation
et reparation vivent ici pour qu'une sortie LLM imparfaite ne casse jamais la
generation : un bloc mal forme est repare a la marge ou ignore proprement, jamais
une exception qui interrompt tout le document."""

import logging

from pydantic import BaseModel, Field, ValidationError

from app.core.document_engine.blocks import BLOCK_REGISTRY, DOCUMENT_SCHEMAS, Block

logger = logging.getLogger(__name__)


class Document(BaseModel):
    doc_type: str
    meta: dict = Field(default_factory=dict)
    blocks: list[Block] = Field(default_factory=list)


def _allowed_block_types(doc_type: str) -> set[str]:
    schema = DOCUMENT_SCHEMAS.get(doc_type)
    return set(schema["blocks"]) if schema else set(BLOCK_REGISTRY.keys())


def repair_block(raw: dict) -> Block | None:
    """Construit un bloc a partir d'un dict brut issu du LLM. Si des champs texte/liste
    requis manquent, comble avec des valeurs vides plutot que d'echouer. Si le type est
    inconnu ou la structure irrecuperable, renvoie None — le bloc est alors ignore."""
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
            if field_name in repaired or not field.is_required():
                continue
            if field.annotation is str:
                repaired[field_name] = ""
            elif getattr(field.annotation, "__origin__", None) is list:
                repaired[field_name] = []
        try:
            return model_cls.model_validate(repaired)
        except ValidationError as exc:
            logger.warning("Bloc irrecuperable ignore (type=%s) : %s", raw.get("type"), exc)
            return None


def validate_document(doc_type: str, data: dict) -> Document:
    """Valide un document complet : ne garde que les blocs conformes au vocabulaire du
    doc_type. Les blocs hors-vocabulaire ou irrecuperables sont silencieusement ecartes
    — jamais d'exception qui bloque la generation."""
    allowed = _allowed_block_types(doc_type)
    blocks: list[Block] = []
    for raw in data.get("blocks") or []:
        block = repair_block(raw)
        if block is not None and block.type in allowed:
            blocks.append(block)
    return Document(doc_type=doc_type, meta=data.get("meta") or {}, blocks=blocks)


def blocks_from_raw(doc_type: str, raw_blocks: list[dict]) -> list[Block]:
    """Meme logique de reparation/filtrage que validate_document, pour une liste de
    blocs deja parses individuellement (utilise par le streaming JSONL, V3-2/V3-3)."""
    allowed = _allowed_block_types(doc_type)
    blocks: list[Block] = []
    for raw in raw_blocks:
        block = repair_block(raw)
        if block is not None and block.type in allowed:
            blocks.append(block)
    return blocks
