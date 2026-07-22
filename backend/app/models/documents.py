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
    # Couleurs choisies par le user (palette curatee, voir document_engine/palette.py)
    # — optionnelles, remplacent les couleurs par defaut du template pour cv/
    # cover_letter uniquement. accent_color : titres/accents. dark_color : nom/
    # elements secondaires, et fond des templates a sidebar/bandeau (jamais le fond
    # blanc de la page). Une valeur hors palette est ignoree silencieusement (voir
    # validate_palette_color), jamais une erreur bloquante.
    accent_color: str | None = None
    dark_color: str | None = None
