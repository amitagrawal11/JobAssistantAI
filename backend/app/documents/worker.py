from __future__ import annotations

import logging
import uuid

from app.config import get_settings
from app.db.session import get_session_factory
from app.documents.parser import DocumentParser
from app.documents.service import DocumentProcessingService
from app.operations.service import OperationService
from app.storage.filesystem import FilesystemStorage


logger = logging.getLogger(__name__)


def safe_processing_error(error: Exception) -> str:
    name = type(error).__name__.lower()
    if "parse" in name or "document" in name:
        return "RESUME_READ_FAILED"
    return "PROFILE_EXTRACTION_FAILED"


def run_document_worker_once(parser: DocumentParser) -> bool:
    with get_session_factory()() as session, session.begin():
        operation_id = OperationService(session).claim_next_parse_operation()
    if operation_id is None:
        return False

    try:
        with get_session_factory()() as session:
            DocumentProcessingService(
                session=session,
                storage=FilesystemStorage(get_settings().storage_root),
                parser=parser,
                publish_stages=True,
            ).process(operation_id)
            session.commit()
    except Exception as error:
        with get_session_factory()() as session, session.begin():
            OperationService(session).fail_by_id(
                operation_id,
                safe_processing_error(error),
            )
        logger.exception(
            "profile_processing_failed",
            extra={"operation_id": str(operation_id)},
        )
    return True


def run_claimed_document_operation(
    operation_id: uuid.UUID,
    parser: DocumentParser,
) -> None:
    try:
        with get_session_factory()() as session:
            DocumentProcessingService(
                session=session,
                storage=FilesystemStorage(get_settings().storage_root),
                parser=parser,
                publish_stages=True,
            ).process(operation_id)
            session.commit()
    except Exception as error:
        with get_session_factory()() as session, session.begin():
            OperationService(session).fail_by_id(
                operation_id,
                safe_processing_error(error),
            )
        raise
