from __future__ import annotations

import io
import json
import shutil
import tempfile
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.entities import (
    Operation,
    OperationStatus,
    ParseRun,
    Profile,
    ProfileFact,
    ProfileReadiness,
    RecordStatus,
    SourceDocument,
)
from app.documents.validation import validate_document
from app.documents.normalizer import normalize_candidate_facts
from app.documents.ai_extractor import extract_candidate_facts
from app.documents.profile_extraction_prompt import PROFILE_EXTRACTION_PROMPT_VERSION
from app.documents.parser import DocumentParser
from app.errors import DomainError
from app.models.document import DocumentReprocessResponse, DocumentUploadResponse
from app.storage.protocol import ObjectStorage
from app.operations.service import OperationService


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

    def reprocess(self, document_id: uuid.UUID) -> DocumentReprocessResponse:
        document = self.session.get(SourceDocument, document_id)
        if document is None:
            raise DomainError(status_code=404, code="SOURCE_DOCUMENT_NOT_FOUND", message="The requested source document was not found.")
        operation = Operation(
            profile_id=document.profile_id,
            operation_type="parse_document",
            status=OperationStatus.pending,
            progress=0,
            payload={"source_document_id": str(document.id)},
        )
        self.session.add(operation)
        self.session.flush()
        return DocumentReprocessResponse(document_id=str(document.id), operation_id=str(operation.id), status="pending")


class DocumentProcessingService:
    def __init__(
        self,
        *,
        session: Session,
        storage: ObjectStorage,
        parser: DocumentParser,
    ) -> None:
        self.session = session
        self.storage = storage
        self.parser = parser
        self.operations = OperationService(session)

    def process(self, operation_id: uuid.UUID) -> ParseRun:
        operation = self.operations.require_pending(operation_id)
        if operation.operation_type != "parse_document":
            raise DomainError(
                status_code=409,
                code="INVALID_OPERATION_TYPE",
                message="The requested operation is not a document parse.",
            )
        try:
            document_id = uuid.UUID(str(operation.payload["source_document_id"]))
        except (KeyError, TypeError, ValueError) as error:
            raise DomainError(
                status_code=422,
                code="INVALID_OPERATION_PAYLOAD",
                message="The parse operation does not reference a valid source document.",
            ) from error
        document = self.session.get(SourceDocument, document_id)
        if document is None or document.profile_id != operation.profile_id:
            raise DomainError(
                status_code=404,
                code="SOURCE_DOCUMENT_NOT_FOUND",
                message="The source document for this operation was not found.",
            )

        self.operations.start(operation)
        document.status = RecordStatus.processing
        self.session.flush()
        result = self._parse_stored_document(document)
        profile = self.session.get(Profile, document.profile_id)
        if profile is None:
            raise RuntimeError("Source document references a missing profile")
        provider_id = profile.ai_preferences.get("provider")
        model = profile.ai_preferences.get("model")
        extraction_metadata: dict[str, str] = {"method": "deterministic"}
        if not provider_id or not model:
            settings = get_settings()
            provider_id = settings.ai_provider
            configured_models = settings.ollama_models if provider_id == "ollama" else settings.openai_models
            model = next((item.strip() for item in configured_models.split(",") if item.strip()), None)
            if model:
                profile.ai_preferences = {"provider": provider_id, "model": model}
        if provider_id in {"ollama", "openai"} and model:
            try:
                facts = extract_candidate_facts(result.parsed_document, provider_id, model)
                extraction_metadata = {
                    "method": "ai_agent",
                    "provider": provider_id,
                    "model": model,
                    "prompt_version": PROFILE_EXTRACTION_PROMPT_VERSION,
                }
            except Exception as error:
                raise DomainError(
                    status_code=503,
                    code="PROFILE_EXTRACTION_FAILED",
                    message="Docling parsed the resume, but the selected AI provider could not extract profile facts. Retry after checking the provider and model.",
                    retryable=True,
                ) from error
        else:
            facts = normalize_candidate_facts(result.parsed_document)

        parse_run_id = uuid.uuid4()
        lossless_key = (
            f"profiles/{document.profile_id}/parsed/{parse_run_id}/docling.json"
        )
        neutral_key = (
            f"profiles/{document.profile_id}/parsed/{parse_run_id}/neutral.json"
        )
        lossless = self.storage.put(
            lossless_key,
            io.BytesIO(
                json.dumps(
                    {
                        "parser": result.parsed_document.parser,
                        "parser_version": result.parsed_document.parser_version,
                        "model_versions": result.parsed_document.model_versions,
                        "document": result.lossless,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode("utf-8")
            ),
        )
        try:
            neutral = self.storage.put(
                neutral_key,
                io.BytesIO(
                    result.parsed_document.model_dump_json().encode("utf-8")
                ),
            )
        except Exception:
            self.storage.delete(lossless.key)
            raise

        parse_run = ParseRun(
            id=parse_run_id,
            source_document_id=document.id,
            operation_id=operation.id,
            parser=result.parsed_document.parser,
            parser_version=result.parsed_document.parser_version,
            status=OperationStatus.succeeded,
            parser_metadata={
                "lossless_storage_key": lossless.key,
                "neutral_storage_key": neutral.key,
                "model_versions": result.parsed_document.model_versions,
                "element_count": len(result.parsed_document.elements),
                "fact_count": len(facts),
                "ocr_retry": result.parsed_document.provenance.get("ocr_retry", False),
            },
        )
        self.session.add(parse_run)
        self.session.flush()

        for existing in self.session.query(ProfileFact).filter_by(
            profile_id=document.profile_id, is_current=True
        ):
            existing.is_current = False
        for fact in facts:
            self.session.add(
                ProfileFact(
                    profile_id=document.profile_id,
                    parse_run_id=parse_run.id,
                    source_document_id=document.id,
                    category=fact.category,
                    fact_key=fact.key,
                    fact_value=fact.value,
                    confidence=fact.confidence,
                    verified=False,
                    provenance={
                        "parser": result.parsed_document.parser,
                        "parser_version": result.parsed_document.parser_version,
                        "element_ids": fact.element_ids,
                        "extraction": extraction_metadata,
                    },
                    page_number=fact.page_number,
                    bounding_box=fact.bounding_box or [],
                    element_ids=fact.element_ids,
                    correction_version=0,
                    is_current=True,
                )
            )

        profile.readiness = ProfileReadiness.needs_review
        profile.source_comparison_resolved = False
        profile.status = RecordStatus.ready
        document.status = RecordStatus.ready
        self.operations.succeed(operation)
        self.session.flush()
        return parse_run

    def _parse_stored_document(self, document: SourceDocument):
        suffix = Path(document.filename).suffix.lower()
        temporary_path: Path | None = None
        try:
            with self.storage.open(document.storage_key) as source:
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
                    shutil.copyfileobj(source, temporary)
                    temporary_path = Path(temporary.name)
            return self.parser.parse(temporary_path, str(document.id))
        finally:
            if temporary_path is not None and temporary_path.exists():
                temporary_path.unlink()
