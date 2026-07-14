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
