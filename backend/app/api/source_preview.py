from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.documents.source_preview import SourcePreviewService
from app.documents.service import DocumentService
from app.errors import DomainError
from app.models.source_preview import SourcePreviewResponse
from app.models.document import DocumentReprocessResponse
from app.storage.filesystem import FilesystemStorage


router = APIRouter(prefix="/documents", tags=["documents"])


def _document_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as error:
        raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="document_id must be a valid UUID.") from error


@router.post("/{document_id}/reprocess", response_model=DocumentReprocessResponse)
def reprocess_document(document_id: str, session: Session = Depends(get_session)) -> DocumentReprocessResponse:
    settings = get_settings()
    return DocumentService(session, FilesystemStorage(settings.storage_root), settings).reprocess(_document_id(document_id))


@router.get("/{document_id}/source-preview", response_model=SourcePreviewResponse)
def source_preview(
    document_id: str, session: Session = Depends(get_session)
) -> SourcePreviewResponse:
    parsed_id = _document_id(document_id)
    settings = get_settings()
    return SourcePreviewService(
        session,
        FilesystemStorage(settings.storage_root),
    ).get(parsed_id)
