from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ats.lever_apply import LeverQuickApplyClient
from app.db.entities import JobPosting, Profile, RecordStatus, SourceDocument
from app.errors import DomainError
from app.models.job_posting import QuickApplyRequest, QuickApplyResponse
from app.storage.protocol import ObjectStorage

SUPPORTED_VENDORS = {"lever"}


class QuickApplyService:
    def __init__(self, session: Session, storage: ObjectStorage, client: LeverQuickApplyClient | None = None) -> None:
        self.session = session
        self.storage = storage
        self.client = client or LeverQuickApplyClient()

    def submit(self, *, job_posting_id: str, request: QuickApplyRequest) -> QuickApplyResponse:
        posting = self.session.get(JobPosting, _parse_uuid(job_posting_id, "job posting"))
        if posting is None or not posting.is_active:
            raise DomainError(status_code=404, code="JOB_POSTING_NOT_FOUND", message="Job posting not found.")
        if posting.vendor not in SUPPORTED_VENDORS:
            raise DomainError(
                status_code=400,
                code="QUICK_APPLY_UNSUPPORTED_VENDOR",
                message=f"Quick Apply isn't available for {posting.vendor} postings yet. Use the Apply button instead.",
            )

        profile = self.session.get(Profile, _parse_uuid(request.profile_id, "profile"))
        if profile is None:
            raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="Profile not found.")
        if not profile.email:
            raise DomainError(
                status_code=422,
                code="PROFILE_MISSING_EMAIL",
                message="Add an email to your profile before using Quick Apply.",
            )

        document = self.session.scalars(
            select(SourceDocument)
            .where(SourceDocument.profile_id == profile.id, SourceDocument.status == RecordStatus.ready)
            .order_by(SourceDocument.created_at.desc())
            .limit(1)
        ).first()
        if document is None:
            raise DomainError(
                status_code=422,
                code="PROFILE_MISSING_RESUME",
                message="Upload a resume to your profile before using Quick Apply.",
            )

        with self.storage.open(document.storage_key) as handle:
            resume_bytes = handle.read()

        self.client.submit(
            hosted_url=posting.hosted_url,
            name=profile.display_name,
            email=profile.email,
            phone=request.phone,
            comments=request.comments,
            resume_filename=document.filename,
            resume_media_type=document.media_type,
            resume_bytes=resume_bytes,
        )
        return QuickApplyResponse(status="submitted")


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as error:
        raise DomainError(
            status_code=422,
            code="INVALID_IDENTIFIER",
            message=f"{label} id must be a valid UUID.",
        ) from error
