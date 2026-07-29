from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.common import ApiModel

ApplicationOutcomeLiteral = Literal["applied", "interview", "offer", "rejected"]


class TrackedApplicationOutput(ApiModel):
    id: str
    profile_id: str
    job_posting_id: str | None
    role: str
    company: str
    location: str | None
    match_score: float | None
    status: ApplicationOutcomeLiteral
    source: str
    applied_at: datetime


class TrackedApplicationListResponse(ApiModel):
    items: list[TrackedApplicationOutput]
    total: int
    counts: dict[str, int]


class TrackedApplicationCreateRequest(ApiModel):
    profile_id: str
    job_posting_id: str | None = None
    role: str = Field(min_length=1, max_length=500)
    company: str = Field(min_length=1, max_length=300)
    location: str | None = None
    match_score: float | None = Field(default=None, ge=0, le=100)
    status: ApplicationOutcomeLiteral = "applied"
    source: str = Field(default="quick_apply", max_length=40)


class TrackedApplicationUpdateRequest(ApiModel):
    status: ApplicationOutcomeLiteral
