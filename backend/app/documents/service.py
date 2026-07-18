from __future__ import annotations

import io
import uuid

from sqlalchemy.orm import Session

from app.config import Settings
from app.db.entities import (
    Operation,
    OperationStatus,
    Profile,
    ProfileReadiness,
    RecordStatus,
    SourceDocument,
)
from app.documents.validation import validate_document
from app.errors import DomainError
from app.models.document import DocumentUploadResponse
from app.storage.protocol import ObjectStorage


class DocumentService:
    def __init__(
        self, session: Session, storage: ObjectStorage, settings: Settings
    ) -> None:
        self.session = session
        self.storage = storage
        self.settings = settings

    def upload(
        self,
        *,
        profile_id: uuid.UUID,
        filename: str,
        media_type: str,
        content: bytes,
    ) -> DocumentUploadResponse:
        profile = self.session.get(Profile, profile_id)
        if profile is None:
            raise DomainError(
                status_code=404,
                code="PROFILE_NOT_FOUND",
                message="The requested profile was not found.",
            )

        validated = validate_document(
            filename=filename,
            media_type=media_type,
            content=content,
            maximum_bytes=self.settings.max_document_bytes,
        )
        document_id = uuid.uuid4()
        storage_key = (
            f"profiles/{profile_id}/source/{document_id}{validated.extension}"
        )
        stored = self.storage.put(storage_key, io.BytesIO(validated.content))
        try:
            document = SourceDocument(
                id=document_id,
                profile_id=profile.id,
                filename=validated.filename,
                media_type=validated.media_type,
                storage_key=stored.key,
                size_bytes=stored.size,
                sha256=stored.sha256,
                status=RecordStatus.pending,
            )
            self.session.add(document)
            self.session.flush()
            operation = Operation(
                profile_id=profile.id,
                operation_type="parse_document",
                status=OperationStatus.pending,
                progress=0,
                payload={"source_document_id": str(document.id)},
            )
            self.session.add(operation)
            profile.readiness = ProfileReadiness.uploaded
            profile.source_comparison_resolved = False
            profile.status = RecordStatus.processing
            self.session.flush()
        except Exception:
            self.storage.delete(stored.key)
            raise

        return DocumentUploadResponse(
            document_id=str(document.id),
            operation_id=str(operation.id),
            filename=document.filename,
            media_type=document.media_type,
            size_bytes=document.size_bytes,
            sha256=document.sha256,
            status="pending",
        )
