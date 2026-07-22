from typing import Literal

from pydantic import BaseModel

DocFormat = Literal["docx", "pdf"]


class RenderRequest(BaseModel):
    """Rend un document deja genere (content_json deja persiste) dans un template et
    un format donnes. Ne rappelle jamais le LLM — voir POST /documents/{doc_type}/generate
    pour la generation elle-meme. title, si fourni, remplace le titre du document
    (le user a pu le modifier apres generation — voir DocumentWorkspace.tsx)."""

    template: str
    format: DocFormat
    title: str | None = None
    # Couleur d'accent choisie par le user (palette curatee, voir
    # document_engine/palette.py) — optionnelle, remplace la couleur par defaut du
    # template pour cv/cover_letter uniquement. Une valeur hors palette est ignoree
    # silencieusement (voir validate_accent_color), jamais une erreur bloquante.
    accent_color: str | None = None
