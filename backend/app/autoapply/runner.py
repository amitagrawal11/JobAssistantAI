from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ats.quick_apply_service import QuickApplyService
from app.autoapply.execution import ExecutionOutcome, apply_outcome, begin_attempt, record_event
from app.db.entities import (
    ApplicationOutcome, AutoApplyPipeline, AutoApplyPipelineStatus, AutoApplyQueueItem,
    AutoApplyStatus, JobPosting, TrackedApplication,
)
from app.errors import DomainError
from app.models.job_posting import QuickApplyRequest
from app.storage.protocol import ObjectStorage


class AutoApplyRunner:
    def __init__(self, session: Session, storage: ObjectStorage, quick_apply: QuickApplyService | None = None) -> None:
        self.session = session
        self.quick_apply = quick_apply or QuickApplyService(session, storage)

    def run_once(self) -> bool:
        pipeline = self.session.scalar(
            select(AutoApplyPipeline)
            .where(AutoApplyPipeline.status == AutoApplyPipelineStatus.running)
            .order_by(AutoApplyPipeline.created_at)
            .with_for_update(skip_locked=True)
        )
        if pipeline is None:
            return False
        row = self.session.scalar(
            select(AutoApplyQueueItem)
            .where(
                AutoApplyQueueItem.pipeline_id == pipeline.id,
                AutoApplyQueueItem.status.in_([AutoApplyStatus.queued, AutoApplyStatus.tailoring]),
            )
            .order_by(AutoApplyQueueItem.position)
            .with_for_update(skip_locked=True)
        )
        if row is None:
            return False
        metadata = dict(row.queue_metadata or {})
        if metadata.get("stage") in {"blocked", "failed", "retry_wait"}:
            return False
        if pipeline.execution_mode == "review" and not metadata.get("approved"):
            row.status = AutoApplyStatus.awaiting_approval
            record_event(row, "ready_for_review", "Application is ready for review")
            return True
        begin_attempt(row)
        row.status = AutoApplyStatus.tailoring
        self.session.flush()
        outcome = self._execute(row)
        stage = apply_outcome(row, outcome)
        if stage == "submitted":
            row.status = AutoApplyStatus.submitted
            self._record_application(row)
            self._advance(pipeline)
        elif stage in {"blocked", "failed"}:
            row.status = AutoApplyStatus.awaiting_approval
            pipeline.status = AutoApplyPipelineStatus.paused
        return True

    def _execute(self, row: AutoApplyQueueItem) -> ExecutionOutcome:
        posting = self.session.get(JobPosting, row.job_posting_id)
        if posting is None:
            return ExecutionOutcome.failed("JOB_POSTING_NOT_FOUND", "The job posting is no longer available.")
        if posting.vendor != "lever":
            return ExecutionOutcome.blocked(
                "UNSUPPORTED_VENDOR",
                f"Automatic submission is not yet supported for {posting.vendor.title()}.",
                posting.apply_url or posting.hosted_url,
            )
        record_event(row, "submitting", "Submitting through Lever")
        try:
            self.quick_apply.submit(
                job_posting_id=str(posting.id),
                request=QuickApplyRequest(profile_id=str(row.profile_id)),
            )
        except DomainError as error:
            if error.retryable:
                return ExecutionOutcome.retryable(error.code, error.message)
            return ExecutionOutcome.blocked(error.code, error.message, posting.apply_url or posting.hosted_url)
        return ExecutionOutcome.submitted()

    def _record_application(self, row: AutoApplyQueueItem) -> None:
        exists = self.session.scalar(select(TrackedApplication).where(
            TrackedApplication.profile_id == row.profile_id,
            TrackedApplication.job_posting_id == row.job_posting_id,
            TrackedApplication.source == "auto_apply",
        ))
        if exists is None:
            self.session.add(TrackedApplication(
                profile_id=row.profile_id, job_posting_id=row.job_posting_id,
                role=row.role, company=row.company, location=row.location,
                match_score=row.match_score, status=ApplicationOutcome.applied,
                source="auto_apply", applied_at=datetime.now(timezone.utc),
                application_metadata={"pipeline_id": str(row.pipeline_id), "queue_item_id": str(row.id)},
            ))

    def _advance(self, pipeline: AutoApplyPipeline) -> None:
        rows = self.session.scalars(
            select(AutoApplyQueueItem).where(AutoApplyQueueItem.pipeline_id == pipeline.id)
            .order_by(AutoApplyQueueItem.position)
        ).all()
        terminal = {AutoApplyStatus.submitted, AutoApplyStatus.skipped}
        if all(row.status in terminal for row in rows):
            pipeline.status = (
                AutoApplyPipelineStatus.completed_with_errors
                if any(row.status == AutoApplyStatus.skipped for row in rows)
                else AutoApplyPipelineStatus.completed
            )
            pipeline.completed_at = datetime.now(timezone.utc)
