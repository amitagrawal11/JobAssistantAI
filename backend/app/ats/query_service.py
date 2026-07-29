from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.entities import JobPosting
from app.models.job_posting import JobPostingListResponse, JobPostingOutput


class JobPostingQueryService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, *, search: str | None, page: int, page_size: int) -> JobPostingListResponse:
        conditions = [JobPosting.is_active.is_(True)]
        if search:
            term = f"%{search.strip()}%"
            conditions.append(or_(
                JobPosting.title.ilike(term),
                JobPosting.company.ilike(term),
                JobPosting.team.ilike(term),
                JobPosting.location.ilike(term),
            ))
        base = select(JobPosting).where(*conditions)
        total = self.session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = self.session.scalars(
            base.order_by(JobPosting.posted_at.desc().nullslast(), JobPosting.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return JobPostingListResponse(
            items=[self._output(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def _output(row: JobPosting) -> JobPostingOutput:
        return JobPostingOutput(
            id=str(row.id),
            vendor=row.vendor,
            company=row.company,
            title=row.title,
            team=row.team,
            location=row.location,
            commitment=row.commitment,
            hosted_url=row.hosted_url,
            apply_url=row.apply_url,
            posted_at=row.posted_at,
            is_active=row.is_active,
        )
