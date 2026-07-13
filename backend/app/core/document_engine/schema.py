from typing import Literal

from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    email: str
    phone: str | None = None
    address: str | None = None
    linkedin: str | None = None


class Experience(BaseModel):
    title: str
    company: str
    location: str | None = None
    start_date: str
    end_date: str | None = None
    description: str
    achievements: list[str] = Field(default_factory=list)


class Education(BaseModel):
    degree: str
    institution: str
    location: str | None = None
    year: str
    details: str | None = None


class LanguageLevel(BaseModel):
    language: str
    level: str


class CVContent(BaseModel):
    full_name: str
    title: str
    contact: ContactInfo
    summary: str
    experiences: list[Experience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    languages: list[LanguageLevel] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class CoverLetterContent(BaseModel):
    full_name: str
    contact: ContactInfo
    recipient_name: str | None = None
    recipient_title: str | None = None
    company_name: str
    date: str
    subject: str
    greeting: str
    paragraphs: list[str]
    closing: str
    signature: str


class ProSection(BaseModel):
    title: str
    content: str
    subsections: list["ProSection"] = Field(default_factory=list)


class ProDocContent(BaseModel):
    doc_type: str
    title: str
    author: str
    organization: str | None = None
    date: str
    sections: list[ProSection]


class OutlineSection(BaseModel):
    id: str
    title: str
    level: int
    children: list["OutlineSection"] = Field(default_factory=list)


class Outline(BaseModel):
    sections: list[OutlineSection]


class AcademicDocContent(BaseModel):
    doc_type: Literal["rapport_stage", "memoire", "these"]
    title: str
    author: str
    institution: str
    supervisor: str | None = None
    year: str
    outline: Outline
    sections: dict[str, str]
    bibliography: list[str] | None = None
    abstract: str | None = None


DOC_TYPE_SCHEMAS: dict[str, type[BaseModel]] = {
    "cv": CVContent,
    "cover_letter": CoverLetterContent,
    "pro_doc": ProDocContent,
    "academic": AcademicDocContent,
}
