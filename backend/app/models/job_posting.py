from __future__ import annotations

from datetime import datetime

from app.models.common import ApiModel


class JobPostingOutput(ApiModel):
    id: str
    vendor: str
    company: str
    title: str
    team: str | None
    location: str | None
    commitment: str | None
    hosted_url: str
    apply_url: str | None
    posted_at: datetime | None
    is_active: bool


class JobPostingListResponse(ApiModel):
    items: list[JobPostingOutput]
    total: int
    page: int
    page_size: int


class JobPostingSyncResponse(ApiModel):
    vendors_synced: list[str]
    vendors_failed: list[str]
    postings_seen: int
    postings_created: int
    postings_updated: int
    postings_deactivated: int


class QuickApplyRequest(ApiModel):
    profile_id: str
    phone: str | None = None
    comments: str | None = None


class QuickApplyResponse(ApiModel):
    status: str
