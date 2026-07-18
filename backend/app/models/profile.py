from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.common import ApiModel, SourceReference


ProfileReadinessValue = Literal["uploaded", "needs_review", "ready", "parse_failed"]


class ProfileCreate(ApiModel):
    display_name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)


class ProfileUpdate(ApiModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)


class FactVerification(ApiModel):
    fact_id: str
    value: str | None = None
    verified: bool


class FactVerificationRequest(ApiModel):
    facts: list[FactVerification] = Field(min_length=1)
    source_comparison_resolved: bool | None = None


class CandidateFact(ApiModel):
    id: str
    category: str
    key: str
    value: str
    confidence: float | None
    verified: bool
    correction_version: int
    source: SourceReference


class ProfileResponse(ApiModel):
    id: str
    display_name: str
    email: str | None
    readiness: ProfileReadinessValue
    source_comparison_resolved: bool
    facts: list[CandidateFact]
    created_at: datetime
    updated_at: datetime
