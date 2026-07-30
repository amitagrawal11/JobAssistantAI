from __future__ import annotations

import io
import json
import logging
import re
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.entities import (
    Operation,
    OperationStage,
    OperationStatus,
    ParseRun,
    Profile,
    ProfileFact,
    ProfileReadiness,
    RecordStatus,
    SourceDocument,
)
from app.ai.registry import ProviderRegistry
from app.documents.validation import validate_document
from app.documents.normalizer import normalize_candidate_facts
from app.documents.ai_extractor import extract_candidate_facts
from app.documents.profile_extraction_prompt import PROFILE_EXTRACTION_PROMPT_VERSION
from app.documents.parser import DocumentParser
from app.errors import DomainError
from app.models.document import DocumentReprocessResponse, DocumentUploadResponse
from app.storage.protocol import ObjectStorage
from app.operations.service import OperationService

logger = logging.getLogger(__name__)

# Model families that are poor at profile extraction (code/embedding models).
_LOW_QUALITY_MODEL_HINTS = ("coder", "-code", "code-", "embed", "embedding")


def _derive_contact_socials(facts) -> tuple[dict[str, str], dict[str, str]]:
    """Pull contact details + social links out of the extracted contact facts."""
    parts = [s.strip() for f in facts if f.category == "contact" for s in f.value.split("|") if s.strip()]
    joined = " ".join(parts)

    def find(pattern: str) -> str:
        match = re.search(pattern, joined, re.IGNORECASE)
        return match.group(0).strip() if match else ""

    email = find(r"[\w.+-]+@[\w-]+\.[\w.-]+")
    phone = find(r"\+?\d[\d ()-]{7,}\d")
    socials = {
        "linkedin": find(r"(?:https?://)?(?:www\.)?linkedin\.com/[^\s|,)\"]+"),
        "github": find(r"(?:https?://)?(?:www\.)?github\.com/[^\s|,)\"]+"),
        "twitter": find(r"(?:https?://)?(?:www\.)?(?:twitter|x)\.com/[^\s|,)\"]+"),
        "telegram": find(r"(?:https?://)?(?:www\.)?t\.me/[^\s|,)\"]+"),
        "discord": find(r"(?:https?://)?(?:www\.)?discord(?:\.gg|(?:app)?\.com/[^\s|,)\"]+)[^\s|,)\"]*"),
    }
    location = next(
        (p for p in parts if not re.search(r"@|linkedin|github|https?://|t\.me|discord|\+?\d[\d ()-]{7,}", p, re.IGNORECASE)),
        "",
    )
    bits = [b.strip() for b in location.split(",") if b.strip()]
    contact = {
        "mobile": phone,
        "email": email,
        "address": "",
        "city": bits[0] if bits else "",
        "country": bits[-1] if len(bits) > 1 else "",
        "zipcode": "",
    }
    return contact, {k: v for k, v in socials.items() if v}


def _preferred_extraction_model(models: list[str]) -> str | None:
    """Pick the best installed model for resume extraction.

    Prefers general chat models and de-prioritizes code/embedding models
    (e.g. deepseek-coder), which extract resumes poorly.
    """
    if not models:
        return None
    ranked = sorted(
        models,
        key=lambda m: any(hint in m.lower() for hint in _LOW_QUALITY_MODEL_HINTS),
    )
    return ranked[0]


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

        OperationService(self.session).require_extraction_slot()
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
            upload_completed_at = datetime.now(timezone.utc)
            operation = Operation(
                profile_id=profile.id,
                operation_type="parse_document",
                status=OperationStatus.pending,
                stage=OperationStage.uploading,
                progress=0,
                payload={
                    "source_document_id": str(document.id),
                    "stage_timings": {
                        "uploading": {
                            "started_at": profile.created_at.isoformat(),
                            "completed_at": upload_completed_at.isoformat(),
                            "duration_ms": max(
                                0,
                                round(
                                    (
                                        upload_completed_at - profile.created_at
                                    ).total_seconds()
                                    * 1000
                                ),
                            ),
                        }
                    },
                },
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
        OperationService(self.session).require_extraction_slot()
        operation = Operation(
            profile_id=document.profile_id,
            operation_type="parse_document",
            status=OperationStatus.pending,
            stage=OperationStage.reading,
            progress=0,
            payload={"source_document_id": str(document.id)},
        )
        self.session.add(operation)
        profile = self.session.get(Profile, document.profile_id)
        if profile is not None:
            profile.status = RecordStatus.processing
            profile.readiness = ProfileReadiness.uploaded
            profile.source_comparison_resolved = False
        document.status = RecordStatus.pending
        self.session.flush()
        return DocumentReprocessResponse(document_id=str(document.id), operation_id=str(operation.id), status="pending")


class DocumentProcessingService:
    def __init__(
        self,
        *,
        session: Session,
        storage: ObjectStorage,
        parser: DocumentParser,
        publish_stages: bool = False,
    ) -> None:
        self.session = session
        self.storage = storage
        self.parser = parser
        self.publish_stages = publish_stages
        self.operations = OperationService(session)

    def process(self, operation_id: uuid.UUID) -> ParseRun:
        operation = self.operations.require_running(operation_id)
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

        document.status = RecordStatus.processing
        self.session.flush()
        result = self._parse_stored_document(document)
        self.operations.set_stage(operation, OperationStage.extracting)
        if self.publish_stages:
            self.session.commit()
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
            if not model and provider_id in {"ollama", "openai"}:
                # No allowlist configured: pick the best model actually installed
                # on the provider instead of silently degrading to the weak
                # deterministic heuristic.
                try:
                    available = ProviderRegistry(settings).get(provider_id).models()
                except Exception:
                    logger.warning("could not list %s models for extraction", provider_id, exc_info=True)
                    available = []
                model = _preferred_extraction_model(available)
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
                # Safety net: if a flaky model run yields fewer facts than the
                # deterministic extractor, keep the larger set so results never
                # regress below the baseline.
                baseline = normalize_candidate_facts(result.parsed_document)
                if len(baseline) > len(facts):
                    logger.warning(
                        "AI extraction returned %s facts (< %s deterministic); using deterministic",
                        len(facts), len(baseline),
                    )
                    facts = baseline
                    extraction_metadata = {"method": "deterministic_fallback", "provider": provider_id, "model": model}
            except Exception:
                # Never fail the upload outright: fall back to the deterministic
                # extractor so the user still gets a usable (if smaller) profile.
                logger.warning(
                    "AI extraction failed (provider=%s model=%s); falling back to deterministic",
                    provider_id, model, exc_info=True,
                )
                facts = normalize_candidate_facts(result.parsed_document)
                extraction_metadata = {"method": "deterministic_fallback", "provider": provider_id, "model": model}
        else:
            facts = normalize_candidate_facts(result.parsed_document)

        # Seed contact + socials from the resume, filling only empty fields so
        # any values the user already edited are preserved on re-upload.
        derived_contact, derived_socials = _derive_contact_socials(facts)
        if not derived_contact.get("email") and profile.email:
            derived_contact["email"] = profile.email
        merged_contact = dict(profile.contact or {})
        for key, value in derived_contact.items():
            if value and not merged_contact.get(key):
                merged_contact[key] = value
        if merged_contact:
            profile.contact = merged_contact
        merged_socials = dict(profile.socials or {})
        for key, value in derived_socials.items():
            if value and not merged_socials.get(key):
                merged_socials[key] = value
        if merged_socials:
            profile.socials = merged_socials

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

        # Only supersede facts in categories the new extraction actually covers.
        # Re-uploading a resume that omits a section then keeps the existing data
        # for that section instead of wiping it; covered sections are overridden.
        new_categories = {fact.category for fact in facts}
        for existing in self.session.query(ProfileFact).filter_by(
            profile_id=document.profile_id, is_current=True
        ):
            if existing.category in new_categories:
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
