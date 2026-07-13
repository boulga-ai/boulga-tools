from typing import Literal

from pydantic import BaseModel, Field

DocType = Literal["cv", "cover_letter", "pro_doc", "academic"]
DocFormat = Literal["docx", "pdf"]


class RenderRequest(BaseModel):
    content_json: dict
    doc_type: DocType
    template: str
    format: DocFormat
    title: str = Field(min_length=1, max_length=200)


class RerenderRequest(BaseModel):
    template: str
    format: DocFormat
