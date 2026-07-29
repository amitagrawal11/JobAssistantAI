from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.common import ApiModel

AutoApplyStatusLiteral = Literal[
    "queued", "awaiting_approval", "tailoring", "submitted", "skipped"
]
AutoApplyPipelineStatusLiteral = Literal[
    "queued", "running", "paused", "completed", "completed_with_errors", "cancelled"
]
AutoApplyExecutionMode = Literal["review", "automatic"]


class AutoApplyEventOutput(ApiModel):
    at: str
    stage: str
    message: str
    attempt: int
    error_code: str | None


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
    position: int = 0
    stage: str = "queued"
    attempt_count: int = 0
    last_error: str | None = None
    retryable: bool = False
    application_url: str | None = None
    events: list[AutoApplyEventOutput] = Field(default_factory=list)


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


class AutoApplyPipelineCreateRequest(ApiModel):
    profile_id: str
    job_posting_ids: list[str] = Field(min_length=1, max_length=100)
    execution_mode: AutoApplyExecutionMode = "review"


class AutoApplyPipelineOutput(ApiModel):
    id: str
    profile_id: str
    status: AutoApplyPipelineStatusLiteral
    total_count: int
    completed_count: int
    failed_count: int
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    items: list[AutoApplyQueueItemOutput]
    execution_mode: AutoApplyExecutionMode


class AutoApplyPipelineControlRequest(ApiModel):
    action: Literal["pause", "resume", "cancel"]


class AutoApplyItemActionRequest(ApiModel):
    action: Literal["retry", "skip", "approve"]


class AutoApplyPipelineListResponse(ApiModel):
    items: list[AutoApplyPipelineOutput]
    total: int
