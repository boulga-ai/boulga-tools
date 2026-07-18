from pydantic import BaseModel, Field


class SavedGenerationRequest(BaseModel):
    tool: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1, max_length=20_000)
    metadata: dict = Field(default_factory=dict)
