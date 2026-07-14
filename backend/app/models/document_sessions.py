from typing import Literal

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    # Vocabulaire propre a chaque outil (ex. "rapport_stage"/"memoire"/"these" pour
    # academique, "Rapport d'activite"/... pour document pro) — pas de Literal partage
    # entre outils ici, coherent avec cadrage: dict deja libre cote documents_engine.py.
    doc_type: str = Field(min_length=1)


class UpdateSessionRequest(BaseModel):
    doc_type: str | None = None
    title: str | None = None
    work_state: dict | None = None
    status: Literal["in_progress", "completed", "abandoned"] | None = None

    def to_fields(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}
