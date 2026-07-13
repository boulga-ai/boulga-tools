from typing import Literal

from pydantic import BaseModel, Field

ReformulatorMode = Literal[
    "reformulation", "correction", "simplification", "formalisation", "academisation"
]
Tone = Literal["convivial", "academique", "professionnel", "neutre", "persuasif", "formel"]


class ReformulatorRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)
    mode: ReformulatorMode
    tone: Tone | None = None


class EmailWriterRequest(BaseModel):
    context: str = Field(min_length=1, max_length=5_000)
    recipient: str = Field(min_length=1, max_length=200)
    objective: str = Field(min_length=1, max_length=2_000)
    tone: str | None = None


SocialPlatform = Literal["linkedin", "facebook", "twitter", "instagram", "whatsapp", "tiktok"]


class SocialPostRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=2_000)
    platform: SocialPlatform
    tone: str
    target_audience: str = Field(min_length=1, max_length=500)
    key_message: str = Field(min_length=1, max_length=2_000)
    call_to_action: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10_000)
    conversation_id: str | None = None


SpeechType = Literal[
    "pitch_elevator",
    "pitch_investor",
    "pitch_commercial",
    "formal",
    "professional",
    "motivation",
    "toast",
    "soutenance",
]


class SpeechRequest(BaseModel):
    speech_type: SpeechType
    context: str = Field(min_length=1, max_length=3_000)
    audience: str = Field(min_length=1, max_length=500)
    key_points: str = Field(min_length=1, max_length=5_000)
    duration: str
    tone: str
    specific_instructions: str | None = None
