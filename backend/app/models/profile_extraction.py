from __future__ import annotations

from pydantic import Field

from app.models.common import ApiModel


class ExtractedProfileFact(ApiModel):
    # Fields are intentionally lenient: a single malformed fact from a weaker
    # model (empty value, out-of-range confidence, etc.) must not fail the whole
    # batch. Invalid facts are filtered downstream in validate_extracted_facts.
    category: str = Field(default="", max_length=80)
    key: str = Field(default="", max_length=160)
    value: str = Field(default="", max_length=12_000)
    confidence: float = Field(default=0.5)
    element_ids: list[str] = Field(default_factory=list)


class ProfileExtractionOutput(ApiModel):
    facts: list[ExtractedProfileFact] = Field(default_factory=list, max_length=250)
