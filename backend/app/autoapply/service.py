from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.entities import (
    ApplicationOutcome,
    AutoApplyQueueItem,
    AutoApplyPipeline,
    AutoApplyPipelineStatus,
    AutoApplyStatus,
    JobPosting,
    Profile,
    TrackedApplication,
)
from app.errors import DomainError
from app.models.auto_apply import (
    AutoApplyEnqueueRequest,
    AutoApplyQueueItemOutput,
    AutoApplyQueueListResponse,
    AutoApplyQueueStats,
    AutoApplyUpdateRequest,
    AutoApplyPipelineCreateRequest,
    AutoApplyPipelineListResponse,
    AutoApplyPipelineOutput,
)


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise DomainError(
            status_code=422, code="INVALID_ID", message=f"{field} is not a valid identifier."
        )


class AutoApplyService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, *, profile_id: str) -> AutoApplyQueueListResponse:
        pid = _parse_uuid(profile_id, field="profile_id")
        rows = self.session.scalars(
            select(AutoApplyQueueItem)
            .where(AutoApplyQueueItem.profile_id == pid)
            .order_by(AutoApplyQueueItem.created_at.desc())
        ).all()
        return AutoApplyQueueListResponse(
            items=[self._output(row) for row in rows],
            total=len(rows),
            stats=self._stats(pid, rows),
        )

    def enqueue(self, request: AutoApplyEnqueueRequest) -> AutoApplyQueueItemOutput:
        pid = _parse_uuid(request.profile_id, field="profile_id")
        if self.session.get(Profile, pid) is None:
            raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="Profile not found.")
        posting_id = _parse_uuid(request.job_posting_id, field="job_posting_id")
        posting = self.session.get(JobPosting, posting_id)
        if posting is None:
            raise DomainError(status_code=404, code="JOB_POSTING_NOT_FOUND", message="Job posting not found.")

        existing = self.session.scalar(
            select(AutoApplyQueueItem).where(
                AutoApplyQueueItem.profile_id == pid,
                AutoApplyQueueItem.job_posting_id == posting_id,
            )
        )
        if existing is not None:
            return self._output(existing)

        row = AutoApplyQueueItem(
            profile_id=pid,
            job_posting_id=posting_id,
            role=posting.title,
            company=posting.company,
            location=posting.location,
            match_score=None,
            status=AutoApplyStatus.queued,
            note=request.note,
        )
        self.session.add(row)
        self.session.flush()
        return self._output(row)

    def create_pipeline(
        self, request: AutoApplyPipelineCreateRequest
    ) -> AutoApplyPipelineOutput:
        pid = _parse_uuid(request.profile_id, field="profile_id")
        if self.session.get(Profile, pid) is None:
            raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="Profile not found.")
        if len(set(request.job_posting_ids)) != len(request.job_posting_ids):
            raise DomainError(
                status_code=422,
                code="DUPLICATE_PIPELINE_JOB",
                message="A job can appear only once in a pipeline.",
            )
        active = self.session.scalar(
            select(AutoApplyPipeline).where(
                AutoApplyPipeline.profile_id == pid,
                AutoApplyPipeline.status.in_(
                    [
                        AutoApplyPipelineStatus.queued,
                        AutoApplyPipelineStatus.running,
                        AutoApplyPipelineStatus.paused,
                    ]
                ),
            )
        )
        if active is not None:
            raise DomainError(
                status_code=409,
                code="ACTIVE_PIPELINE_EXISTS",
                message="Finish or cancel the active Auto-Apply pipeline first.",
            )

        postings: list[JobPosting] = []
        for raw_id in request.job_posting_ids:
            posting = self.session.get(
                JobPosting, _parse_uuid(raw_id, field="job_posting_id")
            )
            if posting is None:
                raise DomainError(
                    status_code=404,
                    code="JOB_POSTING_NOT_FOUND",
                    message="One or more selected jobs are no longer available.",
                )
            postings.append(posting)

        now = datetime.now(timezone.utc)
        pipeline = AutoApplyPipeline(
            profile_id=pid,
            status=AutoApplyPipelineStatus.running,
            started_at=now,
        )
        self.session.add(pipeline)
        self.session.flush()
        rows: list[AutoApplyQueueItem] = []
        for position, posting in enumerate(postings):
            row = AutoApplyQueueItem(
                pipeline_id=pipeline.id,
                position=position,
                profile_id=pid,
                job_posting_id=posting.id,
                role=posting.title,
                company=posting.company,
                location=posting.location,
                match_score=None,
                status=(
                    AutoApplyStatus.awaiting_approval
                    if position == 0
                    else AutoApplyStatus.queued
                ),
            )
            self.session.add(row)
            rows.append(row)
        self.session.flush()
        return self._pipeline_output(pipeline, rows)

    def list_pipelines(self, *, profile_id: str) -> AutoApplyPipelineListResponse:
        pid = _parse_uuid(profile_id, field="profile_id")
        pipelines = self.session.scalars(
            select(AutoApplyPipeline)
            .where(AutoApplyPipeline.profile_id == pid)
            .order_by(AutoApplyPipeline.created_at.desc())
        ).all()
        items = self.session.scalars(
            select(AutoApplyQueueItem)
            .where(AutoApplyQueueItem.pipeline_id.in_([p.id for p in pipelines]))
            .order_by(AutoApplyQueueItem.position)
        ).all() if pipelines else []
        grouped: dict[uuid.UUID, list[AutoApplyQueueItem]] = {}
        for item in items:
            if item.pipeline_id is not None:
                grouped.setdefault(item.pipeline_id, []).append(item)
        return AutoApplyPipelineListResponse(
            items=[self._pipeline_output(p, grouped.get(p.id, [])) for p in pipelines],
            total=len(pipelines),
        )

    def update(self, item_id: str, request: AutoApplyUpdateRequest) -> AutoApplyQueueItemOutput:
        iid = _parse_uuid(item_id, field="item_id")
        row = self.session.get(AutoApplyQueueItem, iid)
        if row is None:
            raise DomainError(status_code=404, code="QUEUE_ITEM_NOT_FOUND", message="Queue item not found.")
        new_status = AutoApplyStatus(request.status)
        # Approving a queued item records a real application.
        if new_status == AutoApplyStatus.submitted and row.status != AutoApplyStatus.submitted:
            self.session.add(
                TrackedApplication(
                    profile_id=row.profile_id,
                    job_posting_id=row.job_posting_id,
                    role=row.role,
                    company=row.company,
                    location=row.location,
                    match_score=row.match_score,
                    status=ApplicationOutcome.applied,
                    source="auto_apply",
                    applied_at=datetime.now(timezone.utc),
                )
            )
        row.status = new_status
        if row.pipeline_id is not None and new_status in (
            AutoApplyStatus.submitted,
            AutoApplyStatus.skipped,
        ):
            self._advance_pipeline(row.pipeline_id)
        self.session.flush()
        return self._output(row)

    def _advance_pipeline(self, pipeline_id: uuid.UUID) -> None:
        pipeline = self.session.get(AutoApplyPipeline, pipeline_id)
        if pipeline is None:
            return
        rows = self.session.scalars(
            select(AutoApplyQueueItem)
            .where(AutoApplyQueueItem.pipeline_id == pipeline_id)
            .order_by(AutoApplyQueueItem.position)
        ).all()
        terminal = {AutoApplyStatus.submitted, AutoApplyStatus.skipped}
        next_row = next((row for row in rows if row.status not in terminal), None)
        if next_row is None:
            pipeline.status = (
                AutoApplyPipelineStatus.completed_with_errors
                if any(row.status == AutoApplyStatus.skipped for row in rows)
                else AutoApplyPipelineStatus.completed
            )
            pipeline.completed_at = datetime.now(timezone.utc)
        elif next_row.status == AutoApplyStatus.queued:
            next_row.status = AutoApplyStatus.awaiting_approval

    def remove(self, item_id: str) -> None:
        iid = _parse_uuid(item_id, field="item_id")
        row = self.session.get(AutoApplyQueueItem, iid)
        if row is None:
            raise DomainError(status_code=404, code="QUEUE_ITEM_NOT_FOUND", message="Queue item not found.")
        self.session.delete(row)
        self.session.flush()

    def _stats(self, pid: uuid.UUID, rows: list[AutoApplyQueueItem]) -> AutoApplyQueueStats:
        awaiting = sum(1 for r in rows if r.status == AutoApplyStatus.awaiting_approval)
        in_queue = sum(
            1 for r in rows
            if r.status in (AutoApplyStatus.queued, AutoApplyStatus.awaiting_approval, AutoApplyStatus.tailoring)
        )
        scores = [float(r.match_score) for r in rows if r.match_score is not None]
        avg_match = round(sum(scores) / len(scores)) if scores else 0

        day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        applied_today = self.session.scalar(
            select(func.count())
            .select_from(TrackedApplication)
            .where(
                TrackedApplication.profile_id == pid,
                TrackedApplication.applied_at >= day_ago,
            )
        ) or 0
        return AutoApplyQueueStats(
            in_queue=in_queue,
            applied_today=applied_today,
            awaiting_approval=awaiting,
            avg_match=avg_match,
        )

    @staticmethod
    def _output(row: AutoApplyQueueItem) -> AutoApplyQueueItemOutput:
        return AutoApplyQueueItemOutput(
            id=str(row.id),
            profile_id=str(row.profile_id),
            job_posting_id=str(row.job_posting_id) if row.job_posting_id else None,
            role=row.role,
            company=row.company,
            location=row.location,
            match_score=float(row.match_score) if row.match_score is not None else None,
            status=row.status.value,
            note=row.note,
            created_at=row.created_at,
            position=row.position,
        )

    def _pipeline_output(
        self, pipeline: AutoApplyPipeline, rows: list[AutoApplyQueueItem]
    ) -> AutoApplyPipelineOutput:
        completed = sum(
            row.status in (AutoApplyStatus.submitted, AutoApplyStatus.skipped)
            for row in rows
        )
        failed = sum(row.status == AutoApplyStatus.skipped for row in rows)
        return AutoApplyPipelineOutput(
            id=str(pipeline.id),
            profile_id=str(pipeline.profile_id),
            status=pipeline.status.value,
            total_count=len(rows),
            completed_count=completed,
            failed_count=failed,
            created_at=pipeline.created_at,
            started_at=pipeline.started_at,
            completed_at=pipeline.completed_at,
            items=[self._output(row) for row in rows],
        )
