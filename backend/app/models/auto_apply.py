from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.common import ApiModel

AutoApplyStatusLiteral = Literal[
    "queued", "awaiting_approval", "tailoring", "submitted", "skipped"
]


class AutoApplyQueueItemOutput(ApiModel):
    id: str
    profile_id: str
    job_posting_id: str | None
    role: str
    company: str
    location: str | None
    match_score: float | None
    status: AutoApplyStatusLiteral
    note: str | None
    created_at: datetime


class AutoApplyQueueStats(ApiModel):
    in_queue: int
    applied_today: int
    awaiting_approval: int
    avg_match: int


class AutoApplyQueueListResponse(ApiModel):
    items: list[AutoApplyQueueItemOutput]
    total: int
    stats: AutoApplyQueueStats


class AutoApplyEnqueueRequest(ApiModel):
    profile_id: str
    job_posting_id: str
    note: str | None = None


class AutoApplyUpdateRequest(ApiModel):
    status: AutoApplyStatusLiteral
