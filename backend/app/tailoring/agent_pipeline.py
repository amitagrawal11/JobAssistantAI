from __future__ import annotations

import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.db.entities import (
    AgentRun,
    DocumentChange,
    GeneratedDocument,
    Job,
    JobRequirement,
    Operation,
    OperationStatus,
    Profile,
    ProfileFact,
    RecordStatus,
    ReviewStatus,
)
from app.errors import DomainError
from app.models.ai import AgentRequest
from app.models.job import JobRequirementOutput
from app.models.tailoring import (
    CoverLetterDocumentOutput,
    DocumentChangeOutput,
    DocumentTailorRequest,
    DocumentTailorResponse,
    ResumeDocumentOutput,
    TailoringAgentOutput,
)
from app.operations.service import OperationService
from app.tailoring.prompts import TAILORING_PROMPT, TAILORING_PROMPT_VERSION


class TailoringPipeline:
    def __init__(self, session: Session) -> None:
        self.session = session

    def tailor(self, request: DocumentTailorRequest) -> DocumentTailorResponse:
        profile = self._get(Profile, request.profile_id, "PROFILE_NOT_FOUND")
        job = self._get(Job, request.job_id, "JOB_NOT_FOUND")
        if profile.readiness.value != "ready":
            raise DomainError(status_code=409, code="PROFILE_NOT_READY", message="Complete profile verification first.")
        provider_id = profile.ai_preferences.get("provider")
        model = profile.ai_preferences.get("model")
        if provider_id not in {"ollama", "openai"} or not model:
            raise DomainError(status_code=409, code="AI_PREFERENCE_REQUIRED", message="Choose an AI provider and model first.")

        requirements = [self._requirement(item) for item in self.session.scalars(
            select(JobRequirement).where(JobRequirement.job_id == job.id)
        )]
        facts = list(self.session.scalars(
            select(ProfileFact).where(
                ProfileFact.profile_id == profile.id,
                ProfileFact.is_current.is_(True),
                ProfileFact.verified.is_(True),
            )
        ))
        if not facts:
            raise DomainError(status_code=409, code="NO_VERIFIED_FACTS", message="Verify at least one candidate fact before tailoring documents.")
        valid_fact_ids = {str(fact.id) for fact in facts}

        operation = Operation(profile_id=profile.id, operation_type="tailor_documents", status=OperationStatus.pending, progress=0, payload={"job_id": str(job.id)})
        self.session.add(operation)
        self.session.flush()
        operations = OperationService(self.session)
        operations.start(operation)

        try:
            result = ProviderRegistry(get_settings()).get(provider_id).run_structured(
                AgentRequest(
                    role="tailoring", provider=provider_id, model=model,
                    prompt_version=TAILORING_PROMPT_VERSION, schema_version="tailoring-v1",
                    inputs={
                        "instructions": TAILORING_PROMPT,
                        "untrusted_requirements": "<REQUIREMENTS>" + json.dumps([item.model_dump() for item in requirements]) + "</REQUIREMENTS>",
                        "untrusted_verified_facts": "<VERIFIED_FACTS>" + json.dumps([
                            {"id": str(fact.id), "category": fact.category, "key": fact.fact_key, "value": fact.fact_value}
                            for fact in facts
                        ]) + "</VERIFIED_FACTS>",
                    },
                ),
                TailoringAgentOutput,
            )
        except Exception as error:
            operations.fail(operation, "AI_PROVIDER_FAILED")
            raise DomainError(
                status_code=503, code="AI_PROVIDER_FAILED",
                message="The selected AI provider could not tailor these documents. Verified facts and requirements are still available for retry.",
                retryable=True,
            ) from error

        resume_doc = GeneratedDocument(
            profile_id=profile.id, job_id=job.id, operation_id=operation.id,
            document_type="resume", status=RecordStatus.ready,
            document_metadata={"provider": provider_id, "model": model, "prompt_version": TAILORING_PROMPT_VERSION},
        )
        self.session.add(resume_doc)
        self.session.flush()
        changes: list[DocumentChange] = []
        for item in result.output.resume_changes:
            source_fact_ids = [fid for fid in item.source_fact_ids if fid in valid_fact_ids]
            change = DocumentChange(
                generated_document_id=resume_doc.id, section=item.section,
                operation=item.operation, classification=item.classification,
                original_text=item.before, proposed_text=item.after, rationale=item.reason,
                status=ReviewStatus.proposed,
                evidence_fact_ids=source_fact_ids,
            )
            self.session.add(change)
            changes.append(change)
        self.session.flush()

        cover_letter_fact_ids = [fid for fid in result.output.cover_letter_source_fact_ids if fid in valid_fact_ids]
        cover_letter_doc = GeneratedDocument(
            profile_id=profile.id, job_id=job.id, operation_id=operation.id,
            document_type="cover_letter", status=RecordStatus.ready,
            document_metadata={
                "provider": provider_id, "model": model, "prompt_version": TAILORING_PROMPT_VERSION,
                "paragraphs": result.output.cover_letter_paragraphs,
                "source_fact_ids": cover_letter_fact_ids,
            },
        )
        self.session.add(cover_letter_doc)
        self.session.flush()

        self.session.add(AgentRun(
            operation_id=operation.id, role="tailoring", provider=provider_id, model=model,
            prompt_version=TAILORING_PROMPT_VERSION, input_schema_version="tailoring-input-v1",
            output_schema_version="tailoring-v1", status=OperationStatus.succeeded,
            agent_metadata=result.provenance.model_dump(mode="json"),
        ))
        operations.succeed(operation)
        self.session.flush()

        return DocumentTailorResponse(
            operation_id=str(operation.id), profile_id=str(profile.id), job_id=str(job.id),
            resume=ResumeDocumentOutput(
                id=str(resume_doc.id), status=resume_doc.status.value,
                changes=[self._change_output(change) for change in changes],
            ),
            cover_letter=CoverLetterDocumentOutput(
                id=str(cover_letter_doc.id), status=cover_letter_doc.status.value,
                paragraphs=result.output.cover_letter_paragraphs,
                source_fact_ids=cover_letter_fact_ids,
            ),
            provider=provider_id, model=model, prompt_version=TAILORING_PROMPT_VERSION,
        )

    def review_change(self, change_id: str, status: str) -> DocumentChange:
        change = self._get(DocumentChange, change_id, "DOCUMENT_CHANGE_NOT_FOUND")
        change.status = ReviewStatus(status)
        self.session.flush()
        return change

    def _get(self, entity_type, value: str, code: str):
        try:
            identifier = uuid.UUID(value)
        except ValueError as error:
            raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="Identifier must be a valid UUID.") from error
        entity = self.session.get(entity_type, identifier)
        if entity is None:
            raise DomainError(status_code=404, code=code, message="The requested record was not found.")
        return entity

    @staticmethod
    def _requirement(item: JobRequirement) -> JobRequirementOutput:
        metadata = item.requirement_metadata
        return JobRequirementOutput(
            requirement_id=metadata["requirement_id"], category=item.category,
            required=item.required, hard_gate=bool(metadata["hard_gate"]),
            normalized_text=item.requirement_text, evidence_text=metadata["evidence_text"],
            evidence_start=int(metadata["evidence_start"]), evidence_end=int(metadata["evidence_end"]),
        )

    @staticmethod
    def _change_output(change: DocumentChange) -> DocumentChangeOutput:
        return DocumentChangeOutput(
            id=str(change.id), section=change.section, operation=change.operation,
            before=change.original_text, after=change.proposed_text,
            classification=change.classification, reason=change.rationale,
            source_fact_ids=change.evidence_fact_ids, status=change.status.value,
        )
