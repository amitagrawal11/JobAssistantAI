from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.entities import Operation, OperationStage, OperationStatus, Profile, ProfileReadiness, RecordStatus, SourceDocument
from app.errors import DomainError


class OperationService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def require_pending(self, operation_id: uuid.UUID) -> Operation:
        operation = self.session.get(Operation, operation_id)
        if operation is None:
            raise DomainError(
                status_code=404,
                code="OPERATION_NOT_FOUND",
                message="The requested operation was not found.",
            )
        if operation.status != OperationStatus.pending:
            raise DomainError(
                status_code=409,
                code="OPERATION_NOT_PENDING",
                message="Only pending operations can be processed.",
            )
        return operation

    def require_running(self, operation_id: uuid.UUID) -> Operation:
        operation = self.session.get(Operation, operation_id)
        if operation is None:
            raise DomainError(
                status_code=404,
                code="OPERATION_NOT_FOUND",
                message="The requested operation was not found.",
            )
        if operation.status != OperationStatus.running:
            raise DomainError(
                status_code=409,
                code="OPERATION_NOT_RUNNING",
                message="The operation has not been claimed for processing.",
            )
        return operation

    def require_extraction_slot(self) -> None:
        active = self.session.scalar(
            select(Operation.id).where(
                Operation.operation_type == "parse_document",
                Operation.status.in_([OperationStatus.pending, OperationStatus.running]),
            )
        )
        if active is not None:
            raise DomainError(
                status_code=409,
                code="PROFILE_EXTRACTION_IN_PROGRESS",
                message="One profile is already being prepared.",
                retryable=True,
            )

    def claim_next_parse_operation(self) -> uuid.UUID | None:
        operation = self.session.scalar(
            select(Operation)
            .where(
                Operation.operation_type == "parse_document",
                Operation.status == OperationStatus.pending,
            )
            .order_by(Operation.created_at)
            .with_for_update(skip_locked=True)
        )
        if operation is None:
            return None
        self.start(operation)
        return operation.id

    def claim(self, operation_id: uuid.UUID) -> Operation:
        operation = self.require_pending(operation_id)
        self.start(operation)
        return operation

    def start(self, operation: Operation) -> None:
        now = datetime.now(timezone.utc)
        operation.status = OperationStatus.running
        operation.stage = OperationStage.reading
        operation.progress = 10
        operation.started_at = now
        operation.heartbeat_at = now
        operation.error_code = None
        self._start_stage(operation, OperationStage.reading, now)
        self.session.flush()

    def set_stage(self, operation: Operation, stage: OperationStage) -> None:
        now = datetime.now(timezone.utc)
        self._finish_stage(operation, operation.stage, now)
        self._start_stage(operation, stage, now)
        operation.stage = stage
        operation.heartbeat_at = now
        if stage == OperationStage.extracting:
            operation.progress = 50
        self.session.flush()

    def succeed(self, operation: Operation) -> None:
        now = datetime.now(timezone.utc)
        self._finish_stage(operation, operation.stage, now)
        operation.status = OperationStatus.succeeded
        operation.stage = OperationStage.complete
        operation.progress = 100
        operation.completed_at = now
        operation.heartbeat_at = now
        self.session.flush()

    def fail(self, operation: Operation, error_code: str) -> None:
        now = datetime.now(timezone.utc)
        self._finish_stage(operation, operation.stage, now)
        operation.status = OperationStatus.failed
        operation.stage = OperationStage.failed
        operation.error_code = error_code
        operation.completed_at = now
        operation.heartbeat_at = now
        if operation.profile_id:
            profile = self.session.get(Profile, operation.profile_id)
            if profile is not None:
                profile.status = RecordStatus.failed
                profile.readiness = ProfileReadiness.parse_failed
        self.session.flush()

    @staticmethod
    def _timings(operation: Operation) -> dict[str, dict[str, object]]:
        raw = operation.payload.get("stage_timings", {})
        return {
            str(key): dict(value)
            for key, value in raw.items()
            if isinstance(value, dict)
        }

    def _start_stage(
        self,
        operation: Operation,
        stage: OperationStage,
        now: datetime,
    ) -> None:
        if stage not in {
            OperationStage.uploading,
            OperationStage.reading,
            OperationStage.extracting,
        }:
            return
        timings = self._timings(operation)
        timings[stage.value] = {
            "started_at": now.isoformat(),
            "completed_at": None,
            "duration_ms": 0,
        }
        operation.payload = {**operation.payload, "stage_timings": timings}

    def _finish_stage(
        self,
        operation: Operation,
        stage: OperationStage | None,
        now: datetime,
    ) -> None:
        if stage is None:
            return
        timings = self._timings(operation)
        timing = timings.get(stage.value)
        if not timing or timing.get("completed_at"):
            return
        started_at = datetime.fromisoformat(str(timing["started_at"]))
        timing["completed_at"] = now.isoformat()
        timing["duration_ms"] = max(0, round((now - started_at).total_seconds() * 1000))
        timings[stage.value] = timing
        operation.payload = {**operation.payload, "stage_timings": timings}

    def fail_by_id(self, operation_id: uuid.UUID, error_code: str) -> None:
        operation = self.session.get(Operation, operation_id)
        if operation is not None and operation.status in {
            OperationStatus.pending,
            OperationStatus.running,
        }:
            self.fail(operation, error_code)

    def expire_stale(self, now: datetime | None = None) -> int:
        current_time = now or datetime.now(timezone.utc)
        cutoff = current_time - timedelta(minutes=15)
        operations = list(
            self.session.scalars(
                select(Operation).where(
                    Operation.operation_type == "parse_document",
                    Operation.status == OperationStatus.running,
                    Operation.heartbeat_at < cutoff,
                )
            )
        )
        for operation in operations:
            self.fail(operation, "PROCESSING_INTERRUPTED")
        interrupted_uploads = list(
            self.session.scalars(
                select(Profile).where(
                    Profile.status == RecordStatus.pending,
                    Profile.created_at < cutoff,
                    ~select(SourceDocument.id)
                    .where(SourceDocument.profile_id == Profile.id)
                    .exists(),
                )
            )
        )
        for profile in interrupted_uploads:
            profile.status = RecordStatus.failed
            profile.readiness = ProfileReadiness.parse_failed
            self.session.add(
                Operation(
                    profile_id=profile.id,
                    operation_type="parse_document",
                    status=OperationStatus.failed,
                    stage=OperationStage.failed,
                    progress=0,
                    error_code="UPLOAD_INTERRUPTED",
                    payload={},
                    completed_at=current_time,
                    heartbeat_at=current_time,
                )
            )
        self.session.flush()
        return len(operations) + len(interrupted_uploads)
