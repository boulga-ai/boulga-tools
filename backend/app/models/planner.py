from typing import Literal

from pydantic import BaseModel, Field

PlannerDocType = Literal[
    "rapport_stage",
    "memoire",
    "these",
    "rapport",
    "note",
    "proposition",
    "business_plan",
    "etude_de_cas",
    "analyse_swot",
    "cahier_charges",
]
PlannerDepth = Literal["essentiel", "detaille", "tres_detaille"]


class PlannerRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=2_000)
    doc_type: PlannerDocType
    depth: PlannerDepth = "detaille"
