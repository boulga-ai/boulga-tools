from typing import Literal

from pydantic import BaseModel

Tier = Literal["introduction", "goutte", "source", "fleuve", "ocean"]


class SetTierRequest(BaseModel):
    tier: Tier
