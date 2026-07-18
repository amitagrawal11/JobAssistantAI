from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.db.entities import AgentRun, Job, JobRequirement, Operation, OperationStatus, Profile, RecordStatus
from app.errors import DomainError
from app.jobs.prompts import JOB_ANALYST_PROMPT, JOB_ANALYST_PROMPT_VERSION
from app.models.ai import AgentRequest
from app.models.job import JobAnalyzeRequest, JobAnalyzeResponse, JobAnalystOutput
from app.operations.service import OperationService


class JobAnalysisService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def analyze(self, request: JobAnalyzeRequest) -> JobAnalyzeResponse:
        profile = self._profile(request.profile_id)
        provider_id, model = self._preference(profile)
        operation = Operation(profile_id=profile.id, operation_type="analyze_job", status=OperationStatus.pending, progress=0, payload={})
        self.session.add(operation)
        self.session.flush()
        operation_service = OperationService(self.session)
        operation_service.start(operation)
        provider = ProviderRegistry(get_settings()).get(provider_id)
        try:
            result = provider.run_structured(
                AgentRequest(
                    role="job_analyst", provider=provider_id, model=model,
                    prompt_version=JOB_ANALYST_PROMPT_VERSION, schema_version="job-requirements-v1",
                    inputs={
                        "instructions": JOB_ANALYST_PROMPT,
                        "provided_title": request.title,
                        "provided_company": request.company,
                        "provided_location": request.location,
                        "untrusted_job_text": f"<JOB_DATA>{request.description}</JOB_DATA>",
                    },
                ),
                JobAnalystOutput,
            )
        except Exception as error:
            raise DomainError(
                status_code=503,
                code="AI_PROVIDER_FAILED",
                message="The selected AI provider could not analyze this job. Your pasted content is still available for retry or editing.",
                retryable=True,
            ) from error
        result.output.requirements = self._validated_requirements(result.output, request.description)
        job = Job(
            title=result.output.title or request.title, company=result.output.company or request.company,
            raw_text=request.description, status=RecordStatus.ready,
            job_metadata={"location": result.output.location or request.location, "source_url": request.source_url,
                          "provider": provider_id, "model": model, "prompt_version": JOB_ANALYST_PROMPT_VERSION},
        )
        self.session.add(job)
        self.session.flush()
        for requirement in result.output.requirements:
            self.session.add(JobRequirement(
                job_id=job.id, category=requirement.category, requirement_text=requirement.normalized_text,
                weight=0, required=requirement.required,
                requirement_metadata={"requirement_id": requirement.requirement_id, "hard_gate": requirement.hard_gate,
                                      "evidence_text": requirement.evidence_text, "evidence_start": requirement.evidence_start,
                                      "evidence_end": requirement.evidence_end},
            ))
        self.session.add(AgentRun(
            operation_id=operation.id, role="job_analyst", provider=provider_id, model=model,
            prompt_version=JOB_ANALYST_PROMPT_VERSION, input_schema_version="job-input-v1",
            output_schema_version="job-requirements-v1", status=OperationStatus.succeeded,
            agent_metadata=result.provenance.model_dump(mode="json"),
        ))
        operation_service.succeed(operation)
        self.session.flush()
        return JobAnalyzeResponse(
            job_id=str(job.id), operation_id=str(operation.id), profile_id=str(profile.id),
            title=job.title, company=job.company,
            location=job.job_metadata.get("location"), source_url=request.source_url,
            description=request.description, requirements=result.output.requirements,
            provider=provider_id, model=model, prompt_version=JOB_ANALYST_PROMPT_VERSION,
        )

    def _profile(self, value: str) -> Profile:
        try: identifier = uuid.UUID(value)
        except ValueError as error: raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="profile_id must be a valid UUID.") from error
        profile = self.session.get(Profile, identifier)
        if profile is None: raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="The requested profile was not found.")
        if profile.readiness.value != "ready": raise DomainError(status_code=409, code="PROFILE_NOT_READY", message="Complete profile verification before analyzing a job.")
        return profile

    @staticmethod
    def _preference(profile: Profile) -> tuple[str, str]:
        provider = profile.ai_preferences.get("provider")
        model = profile.ai_preferences.get("model")
        if provider not in {"ollama", "openai"} or not model:
            raise DomainError(status_code=409, code="AI_PREFERENCE_REQUIRED", message="Choose and save an AI provider and model first.")
        return provider, model

    @staticmethod
    def _validated_requirements(output: JobAnalystOutput, text: str):
        validated = []
        for requirement in output.requirements:
            start = text.find(requirement.evidence_text)
            if start < 0:
                raise DomainError(status_code=422, code="INVALID_JOB_EVIDENCE", message="The Job Analyst returned evidence absent from the job text.")
            validated.append(requirement.model_copy(update={"evidence_start": start, "evidence_end": start + len(requirement.evidence_text)}))
        return validated
