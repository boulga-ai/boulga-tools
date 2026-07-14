from pydantic import BaseModel, Field

# Outline/OutlineSection restent : utilises par le Generateur de plan (app/core/llm/
# prompts/planner.py), hors perimetre de la refonte documentaire V3. Les anciens
# schemas de contenu fige (CVContent, CoverLetterContent, ProDocContent,
# AcademicDocContent, ProSection...) ont ete remplaces par le vocabulaire de blocs
# (app/core/document_engine/blocks.py) et n'existent plus ici.


class OutlineSection(BaseModel):
    id: str
    title: str
    level: int
    children: list["OutlineSection"] = Field(default_factory=list)


class Outline(BaseModel):
    sections: list[OutlineSection]
