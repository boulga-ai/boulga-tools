from typing import Literal

from pydantic import BaseModel

AcademicDocType = Literal["rapport_stage", "memoire", "these"]


class CreateSessionRequest(BaseModel):
    doc_type: AcademicDocType


class UpdateSessionRequest(BaseModel):
    domain: str | None = None
    topic: str | None = None
    outline_json: dict | None = None
    current_step: int | None = None
    template: str | None = None
    status: Literal["in_progress", "completed", "abandoned"] | None = None

    def to_fields(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class SuggestTopicsRequest(BaseModel):
    domain: str
    doc_type: AcademicDocType


class GenerateOutlineRequest(BaseModel):
    topic: str
    domain: str
    doc_type: AcademicDocType


class SectionActionRequest(BaseModel):
    session_id: str
    section_id: str
