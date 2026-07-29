from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.entities import (
    ApplicationOutcome,
    JobPosting,
    Profile,
    TrackedApplication,
)
from app.errors import DomainError
from app.models.tracked_application import (
    TrackedApplicationCreateRequest,
    TrackedApplicationListResponse,
    TrackedApplicationOutput,
    TrackedApplicationUpdateRequest,
)


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise DomainError(
            status_code=422, code="INVALID_ID", message=f"{field} is not a valid identifier."
        )


class ApplicationTrackingService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, *, profile_id: str, status: str | None) -> TrackedApplicationListResponse:
        pid = _parse_uuid(profile_id, field="profile_id")
        conditions = [TrackedApplication.profile_id == pid]
        if status:
            conditions.append(TrackedApplication.status == ApplicationOutcome(status))
        rows = self.session.scalars(
            select(TrackedApplication)
            .where(*conditions)
            .order_by(TrackedApplication.applied_at.desc())
        ).all()

        count_rows = self.session.execute(
            select(TrackedApplication.status, func.count())
            .where(TrackedApplication.profile_id == pid)
            .group_by(TrackedApplication.status)
        ).all()
        counts = {outcome.value: 0 for outcome in ApplicationOutcome}
        for outcome, count in count_rows:
            counts[outcome.value] = count

        return TrackedApplicationListResponse(
            items=[self._output(row) for row in rows],
            total=sum(counts.values()),
            counts=counts,
        )

    def create(self, request: TrackedApplicationCreateRequest) -> TrackedApplicationOutput:
        pid = _parse_uuid(request.profile_id, field="profile_id")
        if self.session.get(Profile, pid) is None:
            raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="Profile not found.")

        role = request.role
        company = request.company
        location = request.location
        posting_id: uuid.UUID | None = None
        if request.job_posting_id:
            posting_id = _parse_uuid(request.job_posting_id, field="job_posting_id")
            posting = self.session.get(JobPosting, posting_id)
            if posting is not None:
                role = role or posting.title
                company = company or posting.company
                location = location or posting.location

        row = TrackedApplication(
            profile_id=pid,
            job_posting_id=posting_id,
            role=role,
            company=company,
            location=location,
            match_score=Decimal(str(request.match_score)) if request.match_score is not None else None,
            status=ApplicationOutcome(request.status),
            source=request.source,
            applied_at=datetime.now(timezone.utc),
        )
        self.session.add(row)
        self.session.flush()
        return self._output(row)

    def update(self, application_id: str, request: TrackedApplicationUpdateRequest) -> TrackedApplicationOutput:
        aid = _parse_uuid(application_id, field="application_id")
        row = self.session.get(TrackedApplication, aid)
        if row is None:
            raise DomainError(status_code=404, code="APPLICATION_NOT_FOUND", message="Application not found.")
        row.status = ApplicationOutcome(request.status)
        self.session.flush()
        return self._output(row)

    @staticmethod
    def _output(row: TrackedApplication) -> TrackedApplicationOutput:
        return TrackedApplicationOutput(
            id=str(row.id),
            profile_id=str(row.profile_id),
            job_posting_id=str(row.job_posting_id) if row.job_posting_id else None,
            role=row.role,
            company=row.company,
            location=row.location,
            match_score=float(row.match_score) if row.match_score is not None else None,
            status=row.status.value,
            source=row.source,
            applied_at=row.applied_at,
        )
