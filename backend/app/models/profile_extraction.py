from __future__ import annotations

from pydantic import Field

from app.models.common import ApiModel


class ExtractedProfileFact(ApiModel):
    category: str = Field(min_length=1, max_length=80)
    key: str = Field(min_length=1, max_length=160)
    value: str = Field(min_length=1, max_length=12_000)
    confidence: float = Field(ge=0, le=1)
    element_ids: list[str]


class ProfileExtractionOutput(ApiModel):
    facts: list[ExtractedProfileFact] = Field(min_length=1, max_length=250)
