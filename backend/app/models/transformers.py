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
    description: str = Field(min_length=1, max_length=5_000)
    tone: str | None = None
    subject: str | None = None
    extra_details: str | None = Field(default=None, max_length=2_000)
    previous_output: str | None = Field(default=None, max_length=10_000)
    refine_instruction: str | None = Field(default=None, max_length=500)


SocialPlatform = Literal["linkedin", "facebook", "twitter", "instagram", "whatsapp", "tiktok"]


class SocialPostRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2_000)
    platform: SocialPlatform
    tone: str | None = None
    target_audience: str | None = Field(default=None, max_length=500)
    keywords: str | None = Field(default=None, max_length=500)
    call_to_action: str | None = None
    previous_output: str | None = Field(default=None, max_length=10_000)
    refine_instruction: str | None = Field(default=None, max_length=500)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10_000)
    conversation_id: str | None = None


SpeechType = Literal["pitch_commercial", "soutenance", "ceremoniel", "prise_parole"]


class SpeechRequest(BaseModel):
    speech_type: SpeechType
    description: str = Field(min_length=1, max_length=5_000)
    duration: str
    tone: str | None = None
    key_points: str | None = Field(default=None, max_length=3_000)
    audience_info: str | None = Field(default=None, max_length=1_000)
    previous_output: str | None = Field(default=None, max_length=10_000)
    refine_instruction: str | None = Field(default=None, max_length=500)
