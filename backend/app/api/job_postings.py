from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ats.query_service import JobPostingQueryService
from app.ats.quick_apply_service import QuickApplyService
from app.ats.scheduler import run_sync_once
from app.config import get_settings
from app.db.session import get_session
from app.models.job_posting import (
    JobPostingListResponse,
    JobPostingSyncResponse,
    QuickApplyRequest,
    QuickApplyResponse,
)
from app.storage.filesystem import FilesystemStorage

router = APIRouter(prefix="/job-postings", tags=["job-postings"])


@router.get("", response_model=JobPostingListResponse)
def list_job_postings(
    search: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    session: Session = Depends(get_session),
) -> JobPostingListResponse:
    return JobPostingQueryService(session).list(search=search, page=page, page_size=page_size)


@router.post("/sync", response_model=JobPostingSyncResponse)
def sync_job_postings() -> JobPostingSyncResponse:
    result = run_sync_once()
    if result is None:
        return JobPostingSyncResponse(
            vendors_synced=[], vendors_failed=[], postings_seen=0,
            postings_created=0, postings_updated=0, postings_deactivated=0,
        )
    return JobPostingSyncResponse(
        vendors_synced=result.vendors_synced,
        vendors_failed=result.vendors_failed,
        postings_seen=result.postings_seen,
        postings_created=result.postings_created,
        postings_updated=result.postings_updated,
        postings_deactivated=result.postings_deactivated,
    )


@router.post("/{job_posting_id}/quick-apply", response_model=QuickApplyResponse)
def quick_apply(
    job_posting_id: str,
    request: QuickApplyRequest,
    session: Session = Depends(get_session),
) -> QuickApplyResponse:
    storage = FilesystemStorage(get_settings().storage_root)
    return QuickApplyService(session, storage).submit(job_posting_id=job_posting_id, request=request)
