from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.applications.service import ApplicationTrackingService
from app.db.entities import ApplicationOutcome, Profile, TrackedApplication
from app.errors import DomainError
from app.models.overview import (
    OverviewOutcome,
    OverviewResponse,
    OverviewStat,
    OverviewTimePoint,
    TopMatch,
)

WEEKS = 8


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise DomainError(
            status_code=422, code="INVALID_ID", message=f"{field} is not a valid identifier."
        )


class OverviewService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, *, profile_id: str) -> OverviewResponse:
        pid = _parse_uuid(profile_id, field="profile_id")
        if self.session.get(Profile, pid) is None:
            raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="Profile not found.")

        rows = self.session.scalars(
            select(TrackedApplication)
            .where(TrackedApplication.profile_id == pid)
            .order_by(TrackedApplication.applied_at.desc())
        ).all()

        scores = [float(r.match_score) for r in rows if r.match_score is not None]
        stats = OverviewStat(
            applications_sent=len(rows),
            avg_match=round(sum(scores) / len(scores)) if scores else 0,
            interviews=sum(1 for r in rows if r.status == ApplicationOutcome.interview),
            offers=sum(1 for r in rows if r.status == ApplicationOutcome.offer),
        )

        outcomes = [
            OverviewOutcome(status=o.value, count=sum(1 for r in rows if r.status == o))
            for o in ApplicationOutcome
        ]

        top_matches = [
            TopMatch(
                job_posting_id=str(r.job_posting_id),
                role=r.role,
                company=r.company,
                location=r.location,
                match_score=round(float(r.match_score)),
            )
            for r in sorted(
                (r for r in rows if r.match_score is not None and r.job_posting_id is not None),
                key=lambda r: r.match_score,
                reverse=True,
            )[:5]
        ]

        recently_applied = [ApplicationTrackingService._output(r) for r in rows[:5]]

        return OverviewResponse(
            stats=stats,
            over_time=self._over_time(rows),
            outcomes=outcomes,
            top_matches=top_matches,
            recently_applied=recently_applied,
        )

    @staticmethod
    def _over_time(rows: list[TrackedApplication]) -> list[OverviewTimePoint]:
        now = datetime.now(timezone.utc)
        # Monday of the current week.
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        buckets: list[OverviewTimePoint] = []
        for i in range(WEEKS - 1, -1, -1):
            start = week_start - timedelta(weeks=i)
            end = start + timedelta(weeks=1)
            count = sum(1 for r in rows if start <= r.applied_at < end)
            buckets.append(OverviewTimePoint(label=start.strftime("%b %-d"), count=count))
        return buckets
