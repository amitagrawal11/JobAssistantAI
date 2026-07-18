from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.entities import Operation, OperationStatus
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

    def start(self, operation: Operation) -> None:
        operation.status = OperationStatus.running
        operation.progress = 10
        operation.started_at = datetime.now(timezone.utc)
        operation.error_code = None
        self.session.flush()

    def succeed(self, operation: Operation) -> None:
        operation.status = OperationStatus.succeeded
        operation.progress = 100
        operation.completed_at = datetime.now(timezone.utc)
        self.session.flush()

    def fail(self, operation: Operation, error_code: str) -> None:
        operation.status = OperationStatus.failed
        operation.error_code = error_code
        operation.completed_at = datetime.now(timezone.utc)
        self.session.flush()
