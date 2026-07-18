from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.documents.service import DocumentProcessingService
from app.errors import DomainError
from app.models.document import DocumentParseResponse
from app.storage.filesystem import FilesystemStorage


router = APIRouter(prefix="/operations", tags=["operations"])


@router.post("/{operation_id}/execute", response_model=DocumentParseResponse)
def execute_operation(
    operation_id: str,
    request: Request,
    session: Session = Depends(get_session),
) -> DocumentParseResponse:
    try:
        parsed_id = uuid.UUID(operation_id)
    except ValueError as error:
        raise DomainError(
            status_code=422,
            code="INVALID_IDENTIFIER",
            message="operation_id must be a valid UUID.",
        ) from error
    parse_run = DocumentProcessingService(
        session=session,
        storage=FilesystemStorage(get_settings().storage_root),
        parser=request.app.state.document_parser,
    ).process(parsed_id)
    return DocumentParseResponse(
        operation_id=operation_id,
        parse_run_id=str(parse_run.id),
        document_id=str(parse_run.source_document_id),
        status="succeeded",
    )
