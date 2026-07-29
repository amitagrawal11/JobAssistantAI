from __future__ import annotations

import json
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.db.entities import AgentRun, Job, JobRequirement, MatchResult, Operation, OperationStatus, ParseRun, Profile, RecordStatus, SourceDocument
from app.documents.source_preview import _readable_text
from app.errors import DomainError
from app.jobs.prompts import CANDIDATE_EVIDENCE_PROMPT, CANDIDATE_EVIDENCE_PROMPT_VERSION
from app.models.ai import AgentRequest
from app.models.job import JobRequirementOutput
from app.models.match import CandidateEvidenceOutput, MatchScoreRequest, MatchScoreResponse
from app.operations.service import OperationService
from app.scoring.aggregator import aggregate_match, normalize_agent_evidence
from app.storage.protocol import ObjectStorage


class MatchScoringPipeline:
    def __init__(self, session: Session, storage: ObjectStorage) -> None:
        self.session = session
        self.storage = storage

    def score(self, request: MatchScoreRequest) -> MatchScoreResponse:
        profile = self._get(Profile, request.profile_id, "PROFILE_NOT_FOUND")
        job = self._get(Job, request.job_id, "JOB_NOT_FOUND")
        if profile.readiness.value != "ready": raise DomainError(status_code=409, code="PROFILE_NOT_READY", message="Complete profile verification first.")
        provider_id = profile.ai_preferences.get("provider"); model = profile.ai_preferences.get("model")
        if provider_id not in {"ollama", "openai"} or not model: raise DomainError(status_code=409, code="AI_PREFERENCE_REQUIRED", message="Choose an AI provider and model first.")
        requirements = [self._requirement(item) for item in self.session.scalars(select(JobRequirement).where(JobRequirement.job_id == job.id))]
        resume_text = self._resume_text(profile.id)
        operation = Operation(profile_id=profile.id, operation_type="score_match", status=OperationStatus.pending, progress=0, payload={"job_id": str(job.id)})
        self.session.add(operation); self.session.flush(); operations = OperationService(self.session); operations.start(operation)
        try:
            result = ProviderRegistry(get_settings()).get(provider_id).run_structured(
                AgentRequest(role="candidate_evidence", provider=provider_id, model=model,
                         prompt_version=CANDIDATE_EVIDENCE_PROMPT_VERSION, schema_version="candidate-evidence-v1",
                         inputs={
                             "instructions": CANDIDATE_EVIDENCE_PROMPT,
                             "untrusted_requirements": (
                                 "<REQUIREMENTS>"
                                 + json.dumps([item.model_dump() for item in requirements])
                                 + "</REQUIREMENTS>"
                             ),
                             "untrusted_resume_text": (
                                 "<RESUME_TEXT>" + resume_text + "</RESUME_TEXT>"
                             ),
                             }),
                CandidateEvidenceOutput,
            )
        except Exception as error:
            raise DomainError(
                status_code=503,
                code="AI_PROVIDER_FAILED",
                message="The selected AI provider could not match this profile. You can retry without losing the analyzed job.",
                retryable=True,
            ) from error
        normalized_evidence = normalize_agent_evidence(
            requirements,
            result.output.evaluations,
        )
        aggregated = aggregate_match(requirements, normalized_evidence)
        match = MatchResult(profile_id=profile.id, job_id=job.id, operation_id=operation.id,
                            score=Decimal(str(aggregated.score)), status=RecordStatus.ready,
                            explanation=aggregated.model_dump(mode="json") | {"provider": provider_id, "model": model, "prompt_version": CANDIDATE_EVIDENCE_PROMPT_VERSION})
        self.session.add(match); self.session.flush()
        self.session.add(AgentRun(operation_id=operation.id, role="candidate_evidence", provider=provider_id, model=model,
                                  prompt_version=CANDIDATE_EVIDENCE_PROMPT_VERSION, input_schema_version="candidate-input-v1",
                                  output_schema_version="candidate-evidence-v1", status=OperationStatus.succeeded,
                                  agent_metadata=result.provenance.model_dump(mode="json")))
        operations.succeed(operation); self.session.flush()
        return MatchScoreResponse(**aggregated.model_dump(), match_id=str(match.id), operation_id=str(operation.id),
                                  profile_id=str(profile.id), job_id=str(job.id), provider=provider_id, model=model,
                                  prompt_version=CANDIDATE_EVIDENCE_PROMPT_VERSION)

    def _get(self, entity_type, value: str, code: str):
        try: identifier = uuid.UUID(value)
        except ValueError as error: raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="Identifier must be a valid UUID.") from error
        entity = self.session.get(entity_type, identifier)
        if entity is None: raise DomainError(status_code=404, code=code, message="The requested record was not found.")
        return entity

    def _resume_text(self, profile_id) -> str:
        parse_run = self.session.scalar(
            select(ParseRun)
            .join(SourceDocument, ParseRun.source_document_id == SourceDocument.id)
            .where(SourceDocument.profile_id == profile_id)
            .order_by(ParseRun.created_at.desc())
            .limit(1)
        )
        if parse_run is None:
            raise DomainError(status_code=409, code="RESUME_NOT_PARSED", message="Parse a resume for this profile before scoring a match.")
        neutral_key = parse_run.parser_metadata.get("neutral_storage_key")
        if not neutral_key:
            raise DomainError(status_code=409, code="RESUME_NOT_PARSED", message="The parsed resume text is unavailable. Reprocess the document and retry.")
        with self.storage.open(neutral_key) as handle:
            neutral = json.loads(handle.read())
        text = _readable_text(neutral.get("elements", []))
        if not text.strip():
            raise DomainError(status_code=409, code="RESUME_TEXT_EMPTY", message="The parsed resume contains no readable text to match.")
        return text

    @staticmethod
    def _requirement(item: JobRequirement) -> JobRequirementOutput:
        metadata = item.requirement_metadata
        return JobRequirementOutput(requirement_id=metadata["requirement_id"], category=item.category,
                                    required=item.required, hard_gate=bool(metadata["hard_gate"]),
                                    normalized_text=item.requirement_text, evidence_text=metadata["evidence_text"],
                                    evidence_start=int(metadata["evidence_start"]),
                                    evidence_end=int(metadata["evidence_end"]))
