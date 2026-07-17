from pydantic import BaseModel, Field

from app.models.transformers import Tone


class AiRewriteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)
    tone: Tone | None = None


class PlagiarismCorrectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)
    flagged_passages: list[str] = Field(min_length=1)
    tone: Tone | None = None


class ScanFeedbackRequest(BaseModel):
    conversation_id: str
    helpful: bool
