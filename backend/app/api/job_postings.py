from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ats.query_service import JobPostingQueryService
from app.ats.quick_apply_service import QuickApplyService
from app.ats.scheduler import run_sync_once
from app.config import get_settings
from app.db.entities import CandidateJobState, JobPosting
from app.db.session import get_session
from app.errors import DomainError
from app.models.job_posting import (
    CandidateJobStatePatch, CandidateJobStateResponse, JobPostingFacetResponse,
    JobPostingFilters, JobPostingListResponse, JobPostingSort,
    JobPostingSyncResponse, QuickApplyRequest, QuickApplyResponse,
)
from app.storage.filesystem import FilesystemStorage

router = APIRouter(prefix="/job-postings", tags=["job-postings"])


def _filters(
    include: list[str] = Query(default=[]), exclude: list[str] = Query(default=[]),
    location: list[str] = Query(default=[]), workplace_type: list[str] = Query(default=[]),
    company: list[str] = Query(default=[]), role_category: list[str] = Query(default=[]),
    employment_type: list[str] = Query(default=[]), experience_level: list[str] = Query(default=[]),
    application_method: list[str] = Query(default=[]), vendor: list[str] = Query(default=[]),
    sponsorship: list[str] = Query(default=[]),
    skill: list[str] = Query(default=[]), language: list[str] = Query(default=[]),
    profile_id: str | None = None, match_level: list[str] = Query(default=[]),
    hide_applied: bool = False, hide_dismissed: bool = False,
    saved_only: bool = False, analyzed_only: bool = False, auto_apply_eligible: bool = False,
    sort: JobPostingSort = JobPostingSort.newest,
) -> JobPostingFilters:
    candidate_requested = bool(
        match_level or hide_applied or hide_dismissed or saved_only or analyzed_only
        or auto_apply_eligible or sort == JobPostingSort.best_match
    )
    if candidate_requested and not profile_id:
        raise DomainError(
            status_code=422,
            code="PROFILE_REQUIRED_FOR_JOB_FILTERS",
            message="Select a profile before using candidate-aware job filters.",
        )
    if profile_id:
        try:
            uuid.UUID(profile_id)
        except ValueError as error:
            raise DomainError(
                status_code=422,
                code="INVALID_IDENTIFIER",
                message="profile_id must be a valid UUID.",
            ) from error
    return JobPostingFilters(
        include=include, exclude=exclude,
        locations=location, workplace_types=workplace_type, companies=company,
        role_categories=role_category, employment_types=employment_type,
        experience_levels=experience_level, application_methods=application_method,
        vendors=vendor, sponsorship=sponsorship, skills=skill, languages=language,
        profile_id=profile_id, match_levels=match_level, hide_applied=hide_applied,
        hide_dismissed=hide_dismissed, saved_only=saved_only,
        analyzed_only=analyzed_only, auto_apply_eligible=auto_apply_eligible, sort=sort,
    )


@router.get("", response_model=JobPostingListResponse)
def list_job_postings(
    page: int = Query(default=1, ge=1), page_size: int = Query(default=24, ge=1, le=100),
    filters: JobPostingFilters = Depends(_filters), session: Session = Depends(get_session),
) -> JobPostingListResponse:
    return JobPostingQueryService(session).list(filters=filters, page=page, page_size=page_size)


@router.get("/facets", response_model=JobPostingFacetResponse)
def job_posting_facets(
    filters: JobPostingFilters = Depends(_filters), session: Session = Depends(get_session),
) -> JobPostingFacetResponse:
    return JobPostingQueryService(session).facets(filters)


@router.patch("/{job_posting_id}/state", response_model=CandidateJobStateResponse)
def update_candidate_state(
    job_posting_id: str, request: CandidateJobStatePatch, profile_id: str,
    session: Session = Depends(get_session),
) -> CandidateJobStateResponse:
    try:
        job_uuid, profile_uuid = uuid.UUID(job_posting_id), uuid.UUID(profile_id)
    except ValueError as error:
        raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="Identifiers must be UUIDs.") from error
    if session.get(JobPosting, job_uuid) is None:
        raise DomainError(status_code=404, code="JOB_POSTING_NOT_FOUND", message="Job posting not found.")
    state = session.scalar(select(CandidateJobState).where(
        CandidateJobState.job_posting_id == job_uuid, CandidateJobState.profile_id == profile_uuid,
    ))
    if state is None:
        state = CandidateJobState(job_posting_id=job_uuid, profile_id=profile_uuid)
        session.add(state)
    if request.saved is not None:
        state.saved = request.saved
        if request.saved:
            state.dismissed = False
    if request.dismissed is not None:
        state.dismissed = request.dismissed
        if request.dismissed:
            state.saved = False
    session.flush()
    return CandidateJobStateResponse(
        job_posting_id=job_posting_id, profile_id=profile_id,
        saved=state.saved, dismissed=state.dismissed,
    )


@router.post("/sync", response_model=JobPostingSyncResponse)
def sync_job_postings() -> JobPostingSyncResponse:
    result = run_sync_once()
    if result is None:
        return JobPostingSyncResponse(vendors_synced=[], vendors_failed=[], postings_seen=0,
                                      postings_created=0, postings_updated=0, postings_deactivated=0)
    return JobPostingSyncResponse(
        vendors_synced=result.vendors_synced, vendors_failed=result.vendors_failed,
        postings_seen=result.postings_seen, postings_created=result.postings_created,
        postings_updated=result.postings_updated, postings_deactivated=result.postings_deactivated,
    )


@router.post("/{job_posting_id}/quick-apply", response_model=QuickApplyResponse)
def quick_apply(
    job_posting_id: str, request: QuickApplyRequest, session: Session = Depends(get_session),
) -> QuickApplyResponse:
    storage = FilesystemStorage(get_settings().storage_root)
    return QuickApplyService(session, storage).submit(job_posting_id=job_posting_id, request=request)
