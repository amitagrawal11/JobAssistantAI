from __future__ import annotations

import uuid
from collections import defaultdict

from sqlalchemy import and_, asc, desc, exists, func, not_, or_, select
from sqlalchemy.orm import Session

from app.db.entities import CandidateJobState, JobPosting, TrackedApplication
from app.models.job_posting import (
    FacetOption, JobPostingFacetResponse, JobPostingFilters, JobPostingListResponse,
    JobPostingOutput, JobPostingSort,
)


class JobPostingQueryService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, *, filters: JobPostingFilters, page: int, page_size: int) -> JobPostingListResponse:
        profile_uuid = self._profile_uuid(filters.profile_id)
        conditions = self._conditions(filters, profile_uuid)
        base = select(JobPosting, CandidateJobState).outerjoin(
            CandidateJobState,
            and_(
                CandidateJobState.job_posting_id == JobPosting.id,
                CandidateJobState.profile_id == profile_uuid,
            ) if profile_uuid else CandidateJobState.id.is_(None),
        ).where(*conditions)
        total = self.session.scalar(
            select(func.count()).select_from(
                select(JobPosting.id).outerjoin(
                    CandidateJobState,
                    and_(CandidateJobState.job_posting_id == JobPosting.id,
                         CandidateJobState.profile_id == profile_uuid)
                    if profile_uuid else CandidateJobState.id.is_(None),
                ).where(*conditions).subquery()
            )
        ) or 0
        rows = self.session.execute(
            base.order_by(*self._order(filters.sort))
            .offset((page - 1) * page_size).limit(page_size)
        ).all()
        return JobPostingListResponse(
            items=[self._output(posting, state) for posting, state in rows],
            total=total, page=page, page_size=page_size,
        )

    def facets(self, filters: JobPostingFilters) -> JobPostingFacetResponse:
        profile_uuid = self._profile_uuid(filters.profile_id)
        conditions = self._conditions(filters, profile_uuid)
        statement = select(JobPosting).outerjoin(
            CandidateJobState,
            and_(CandidateJobState.job_posting_id == JobPosting.id,
                 CandidateJobState.profile_id == profile_uuid)
            if profile_uuid else CandidateJobState.id.is_(None),
        ).where(*conditions)
        rows = self.session.scalars(statement).all()
        buckets: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for row in rows:
            values = {
                "company": row.company,
                "location": row.location,
                "workplace_type": row.workplace_type,
                "role_category": row.role_category,
                "employment_type": row.employment_type,
                "experience_level": row.experience_level,
                "sponsorship": row.sponsorship,
                "vendor": row.vendor,
                "application_method": "quick_apply" if row.vendor == "lever" and row.apply_url else "company_site",
            }
            for key, value in values.items():
                if self._is_selectable(value):
                    buckets[key][value] += 1
            for skill in row.skills:
                if self._is_selectable(skill):
                    buckets["skill"][skill] += 1
            for language in row.languages:
                if self._is_selectable(language):
                    buckets["language"][language] += 1
        return JobPostingFacetResponse(facets={
            key: [
                FacetOption(value=value, label=self._label(value), count=count)
                for value, count in sorted(values.items(), key=lambda item: (-item[1], item[0].lower()))
            ]
            for key, values in buckets.items()
        })

    @staticmethod
    def _profile_uuid(profile_id: str | None) -> uuid.UUID | None:
        if not profile_id:
            return None
        return uuid.UUID(profile_id)

    def _conditions(self, filters: JobPostingFilters, profile_id: uuid.UUID | None) -> list:
        conditions = [JobPosting.is_active.is_(True)]
        searchable = func.concat_ws(
            " ", JobPosting.title, JobPosting.company, JobPosting.team,
            JobPosting.location, JobPosting.description_text,
        )
        for token in filters.include:
            conditions.append(searchable.ilike(f"%{token.strip().strip(chr(34))}%"))
        for token in filters.exclude:
            conditions.append(not_(searchable.ilike(f"%{token.strip().strip(chr(34))}%")))
        pairs = (
            (filters.locations, JobPosting.location),
            (filters.workplace_types, JobPosting.workplace_type),
            (filters.companies, JobPosting.company),
            (filters.role_categories, JobPosting.role_category),
            (filters.employment_types, JobPosting.employment_type),
            (filters.experience_levels, JobPosting.experience_level),
            (filters.vendors, JobPosting.vendor),
            (filters.sponsorship, JobPosting.sponsorship),
        )
        for values, column in pairs:
            if values:
                conditions.append(column.in_(values))
        if filters.application_methods:
            methods = []
            if "quick_apply" in filters.application_methods:
                methods.append(and_(JobPosting.vendor == "lever", JobPosting.apply_url.is_not(None)))
            if "company_site" in filters.application_methods:
                methods.append(or_(JobPosting.vendor != "lever", JobPosting.apply_url.is_(None)))
            conditions.append(or_(*methods))
        for skill in filters.skills:
            conditions.append(JobPosting.skills.contains([skill]))
        for language in filters.languages:
            conditions.append(JobPosting.languages.contains([language]))
        if profile_id:
            if filters.match_levels:
                conditions.append(CandidateJobState.match_level.in_(filters.match_levels))
            if filters.hide_dismissed:
                conditions.append(or_(CandidateJobState.dismissed.is_(False), CandidateJobState.id.is_(None)))
            if filters.saved_only:
                conditions.append(CandidateJobState.saved.is_(True))
            if filters.analyzed_only:
                conditions.append(CandidateJobState.match_score.is_not(None))
            if filters.hide_applied:
                conditions.append(not_(exists(select(TrackedApplication.id).where(
                    TrackedApplication.profile_id == profile_id,
                    TrackedApplication.job_posting_id == JobPosting.id,
                ))))
            if filters.auto_apply_eligible:
                conditions.append(and_(JobPosting.vendor == "lever", JobPosting.apply_url.is_not(None)))
        return conditions

    @staticmethod
    def _order(sort: JobPostingSort) -> tuple:
        if sort == JobPostingSort.oldest:
            return (asc(JobPosting.posted_at).nullslast(), asc(JobPosting.created_at))
        if sort == JobPostingSort.company_asc:
            return (asc(func.lower(JobPosting.company)), desc(JobPosting.posted_at).nullslast())
        if sort == JobPostingSort.company_desc:
            return (desc(func.lower(JobPosting.company)), desc(JobPosting.posted_at).nullslast())
        if sort == JobPostingSort.best_match:
            return (desc(CandidateJobState.match_score).nullslast(), desc(JobPosting.posted_at).nullslast())
        return (desc(JobPosting.posted_at).nullslast(), desc(JobPosting.created_at))

    @staticmethod
    def _label(value: str) -> str:
        return value.replace("_", " ").title().replace("On Site", "On-site")

    @staticmethod
    def _is_selectable(value: object) -> bool:
        return value is not None and bool(str(value).strip()) and str(value).strip().lower() != "unknown"

    @staticmethod
    def _output(row: JobPosting, state: CandidateJobState | None = None) -> JobPostingOutput:
        return JobPostingOutput(
            id=str(row.id), vendor=row.vendor, company=row.company, title=row.title,
            team=row.team, location=row.location, commitment=row.commitment,
            hosted_url=row.hosted_url, apply_url=row.apply_url, posted_at=row.posted_at,
            is_active=row.is_active, workplace_type=row.workplace_type,
            employment_type=row.employment_type, role_category=row.role_category,
            experience_level=row.experience_level, max_experience=row.max_experience,
            degree_level=row.degree_level, sponsorship=row.sponsorship,
            salary_min=row.salary_min, salary_max=row.salary_max,
            salary_currency=row.salary_currency, salary_period=row.salary_period,
            skills=row.skills, languages=row.languages, industry=row.industry,
            travel=row.travel, enrichment_evidence=row.enrichment_evidence,
            saved=state.saved if state else False, dismissed=state.dismissed if state else False,
            match_score=float(state.match_score) if state and state.match_score is not None else None,
            match_level=state.match_level if state else None,
            missing_critical_skills=state.missing_critical_skills if state else None,
        )
