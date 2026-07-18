from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.documents.source_preview import SourcePreviewService
from app.errors import DomainError
from app.models.source_preview import SourcePreviewResponse
from app.storage.filesystem import FilesystemStorage


router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/{document_id}/source-preview", response_model=SourcePreviewResponse)
def source_preview(
    document_id: str, session: Session = Depends(get_session)
) -> SourcePreviewResponse:
    try:
        parsed_id = uuid.UUID(document_id)
    except ValueError as error:
        raise DomainError(
            status_code=422,
            code="INVALID_IDENTIFIER",
            message="document_id must be a valid UUID.",
        ) from error
    settings = get_settings()
    return SourcePreviewService(
        session,
        FilesystemStorage(settings.storage_root),
    ).get(parsed_id)
