from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.documents.service import DocumentService
from app.errors import DomainError
from app.models.document import DocumentUploadResponse
from app.api.profiles import profile_id
from app.storage.filesystem import FilesystemStorage


router = APIRouter(prefix="/profiles", tags=["documents"])


@router.post(
    "/{profile_id_value}/documents",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_document(
    profile_id_value: str,
    document: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> DocumentUploadResponse:
    settings = get_settings()
    content = await document.read(settings.max_document_bytes + 1)
    if len(content) > settings.max_document_bytes:
        raise DomainError(
            status_code=413,
            code="DOCUMENT_TOO_LARGE",
            message=(
                f"Resume files must be {settings.max_document_bytes} bytes or smaller."
            ),
        )
    return DocumentService(
        session,
        FilesystemStorage(settings.storage_root),
        settings,
    ).upload(
        profile_id=profile_id(profile_id_value),
        filename=document.filename or "",
        media_type=document.content_type or "",
        content=content,
    )
