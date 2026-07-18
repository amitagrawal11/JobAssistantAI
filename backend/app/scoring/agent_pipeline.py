from __future__ import annotations

import json
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.db.entities import AgentRun, Job, JobRequirement, MatchResult, Operation, OperationStatus, Profile, ProfileFact, RecordStatus
from app.errors import DomainError
from app.jobs.prompts import CANDIDATE_EVIDENCE_PROMPT, CANDIDATE_EVIDENCE_PROMPT_VERSION
from app.models.ai import AgentRequest
from app.models.job import JobRequirementOutput
from app.models.match import CandidateEvidenceOutput, MatchScoreRequest, MatchScoreResponse
from app.operations.service import OperationService
from app.scoring.aggregator import aggregate_match, normalize_agent_evidence


class MatchScoringPipeline:
    def __init__(self, session: Session) -> None: self.session = session

    def score(self, request: MatchScoreRequest) -> MatchScoreResponse:
        profile = self._get(Profile, request.profile_id, "PROFILE_NOT_FOUND")
        job = self._get(Job, request.job_id, "JOB_NOT_FOUND")
        if profile.readiness.value != "ready": raise DomainError(status_code=409, code="PROFILE_NOT_READY", message="Complete profile verification first.")
        provider_id = profile.ai_preferences.get("provider"); model = profile.ai_preferences.get("model")
        if provider_id not in {"ollama", "openai"} or not model: raise DomainError(status_code=409, code="AI_PREFERENCE_REQUIRED", message="Choose an AI provider and model first.")
        requirements = [self._requirement(item) for item in self.session.scalars(select(JobRequirement).where(JobRequirement.job_id == job.id))]
        facts = list(self.session.scalars(select(ProfileFact).where(ProfileFact.profile_id == profile.id, ProfileFact.is_current.is_(True), ProfileFact.verified.is_(True))))
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
                             "untrusted_profile_facts": (
                                 "<PROFILE_FACTS>"
                                 + json.dumps([
                                     {
                                         "fact_id": str(fact.id),
                                         "category": fact.category,
                                         "key": fact.fact_key,
                                         "value": fact.fact_value,
                                     }
                                     for fact in facts
                                 ])
                                 + "</PROFILE_FACTS>"
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
        verified_fact_ids = {str(fact.id) for fact in facts}
        normalized_evidence = normalize_agent_evidence(
            requirements,
            result.output.evaluations,
            verified_fact_ids,
        )
        aggregated = aggregate_match(requirements, normalized_evidence, verified_fact_ids)
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

    @staticmethod
    def _requirement(item: JobRequirement) -> JobRequirementOutput:
        metadata = item.requirement_metadata
        return JobRequirementOutput(requirement_id=metadata["requirement_id"], category=item.category,
                                    required=item.required, hard_gate=bool(metadata["hard_gate"]),
                                    normalized_text=item.requirement_text, evidence_text=metadata["evidence_text"],
                                    evidence_start=int(metadata["evidence_start"]),
                                    evidence_end=int(metadata["evidence_end"]))
