from __future__ import annotations

from app.models.common import ApiModel
from app.models.tracked_application import TrackedApplicationOutput


class OverviewStat(ApiModel):
    applications_sent: int
    avg_match: int
    interviews: int
    offers: int


class OverviewTimePoint(ApiModel):
    label: str
    count: int


class OverviewOutcome(ApiModel):
    status: str
    count: int


class TopMatch(ApiModel):
    job_posting_id: str
    role: str
    company: str
    location: str | None
    match_score: int


class OverviewResponse(ApiModel):
    stats: OverviewStat
    over_time: list[OverviewTimePoint]
    outcomes: list[OverviewOutcome]
    top_matches: list[TopMatch]
    recently_applied: list[TrackedApplicationOutput]
