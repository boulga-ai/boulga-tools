from typing import Literal

from pydantic import BaseModel, Field

PlannerDepth = Literal["essentiel", "detaille", "tres_detaille"]


class PlannerRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=2_000)
    # str et non Literal : reutilise par le Document professionnel (Correction 3) avec son
    # propre vocabulaire de types de document, distinct de celui du Generateur de plan.
    # build_user_message() retombe sur le libelle brut si la cle n'est pas dans
    # DOC_TYPE_LABELS (voir app/core/llm/prompts/planner.py), donc aucune contrainte stricte
    # n'est necessaire ici.
    doc_type: str = Field(min_length=1, max_length=100)
    depth: PlannerDepth = "detaille"
