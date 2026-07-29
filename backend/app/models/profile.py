from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.models.common import ApiModel, SourceReference


ProfileReadinessValue = Literal["uploaded", "needs_review", "ready", "parse_failed"]


class ProfileCreate(ApiModel):
    display_name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)


class ProfileUpdate(ApiModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    contact: dict[str, Any] | None = None
    application_defaults: dict[str, Any] | None = None
    socials: dict[str, str] | None = None
    custom_sections: list[dict[str, Any]] | None = None


class FactVerification(ApiModel):
    fact_id: str
    value: str | None = None
    verified: bool


class FactVerificationRequest(ApiModel):
    facts: list[FactVerification] = Field(min_length=1)
    source_comparison_resolved: bool | None = None


class FactCreateRequest(ApiModel):
    category: str = Field(min_length=1, max_length=80)
    key: str = Field(min_length=1, max_length=160)
    value: str = Field(min_length=1, max_length=12_000)


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
    is_default: bool
    source_filename: str | None
    ai_preferences: dict[str, str]
    contact: dict[str, Any]
    application_defaults: dict[str, Any]
    socials: dict[str, str]
    custom_sections: list[dict[str, Any]]
    facts: list[CandidateFact]
    created_at: datetime
    updated_at: datetime
