from __future__ import annotations

import unittest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from app.db.entities import Operation, OperationStage, OperationStatus
from app.documents.worker import safe_processing_error
from app.errors import DomainError
from app.models.profile import ProfileProcessing
from app.operations.service import OperationService


class DocumentParseError(RuntimeError):
    pass


class ProfileProcessingLifecycleTests(unittest.TestCase):
    def test_processing_contract_carries_stage_and_source_document(self) -> None:
        source_id = uuid.uuid4()
        summary = ProfileProcessing(
            operation_id=str(uuid.uuid4()),
            source_document_id=str(source_id),
            status="running",
            stage="reading",
            error_code=None,
            retryable=False,
            started_at=datetime.now(timezone.utc),
            completed_at=None,
            stage_timings={},
        )
        self.assertEqual(summary.stage, "reading")
        self.assertEqual(summary.source_document_id, str(source_id))

    def test_extraction_slot_rejects_an_existing_active_operation(self) -> None:
        session = MagicMock()
        session.scalar.return_value = uuid.uuid4()
        with self.assertRaises(DomainError) as raised:
            OperationService(session).require_extraction_slot()
        self.assertEqual(raised.exception.code, "PROFILE_EXTRACTION_IN_PROGRESS")

    def test_stage_transition_updates_heartbeat(self) -> None:
        session = MagicMock()
        operation = Operation(
            operation_type="parse_document",
            status=OperationStatus.pending,
            stage=OperationStage.uploading,
            progress=0,
            payload={},
        )
        service = OperationService(session)
        service.start(operation)
        service.set_stage(operation, OperationStage.extracting)
        self.assertEqual(operation.stage, OperationStage.extracting)
        self.assertEqual(operation.progress, 50)
        self.assertIsNotNone(operation.heartbeat_at)
        timings = operation.payload["stage_timings"]
        self.assertIsNotNone(timings["reading"]["completed_at"])
        self.assertIn("extracting", timings)

    def test_stale_operation_becomes_interrupted(self) -> None:
        session = MagicMock()
        operation = Operation(
            operation_type="parse_document",
            status=OperationStatus.running,
            stage=OperationStage.reading,
            progress=10,
            payload={},
            heartbeat_at=datetime.now(timezone.utc) - timedelta(minutes=16),
        )
        session.scalars.side_effect = [[operation], []]
        count = OperationService(session).expire_stale()
        self.assertEqual(count, 1)
        self.assertEqual(operation.status, OperationStatus.failed)
        self.assertEqual(operation.stage, OperationStage.failed)
        self.assertEqual(operation.error_code, "PROCESSING_INTERRUPTED")

    def test_safe_failure_category_does_not_expose_raw_error(self) -> None:
        self.assertEqual(
            safe_processing_error(DocumentParseError("secret parser detail")),
            "RESUME_READ_FAILED",
        )
        self.assertEqual(
            safe_processing_error(RuntimeError("secret model detail")),
            "PROFILE_EXTRACTION_FAILED",
        )


if __name__ == "__main__":
    unittest.main()
