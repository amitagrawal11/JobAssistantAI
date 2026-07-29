from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.entities import Operation, OperationStage, ParseRun, Profile, ProfileFact, ProfileReadiness, RecordStatus, SourceDocument
from app.errors import DomainError
from app.models.common import SourceReference
from app.models.profile import (
    CandidateFact,
    FactCreateRequest,
    FactVerificationRequest,
    ProfileCreate,
    ProfileProcessing,
    ProfileStageTiming,
    ProfileResponse,
    ProfileUpdate,
)
from app.operations.service import OperationService


class ProfileService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, request: ProfileCreate) -> ProfileResponse:
        profile = Profile(
            display_name=request.display_name,
            email=request.email,
            status=RecordStatus.pending,
            readiness=ProfileReadiness.uploaded,
            source_comparison_resolved=False,
        )
        self.session.add(profile)
        self.session.flush()
        # First profile (or when none is marked yet) becomes the default.
        if self.session.scalar(select(Profile.id).where(Profile.is_default.is_(True))) is None:
            profile.is_default = True
            self.session.flush()
        return self._response(profile, [])

    def get(self, profile_id: uuid.UUID) -> ProfileResponse:
        OperationService(self.session).expire_stale()
        profile = self._get_profile(profile_id)
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        return self._response(profile, facts)

    def list(self) -> list[ProfileResponse]:
        OperationService(self.session).expire_stale()
        profiles = list(
            self.session.scalars(
                select(Profile)
                .where(Profile.status != RecordStatus.archived)
                .order_by(
                    Profile.updated_at.desc(),
                    Profile.created_at.desc(),
                )
            )
        )
        responses: list[ProfileResponse] = []
        for profile in profiles:
            facts = self._current_facts(profile.id)
            self._refresh_readiness(profile, facts)
            responses.append(self._response(profile, facts))
        self.session.flush()
        return responses

    def update(self, profile_id: uuid.UUID, request: ProfileUpdate) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        changes = request.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(profile, field, value)
        self.session.flush()
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        return self._response(profile, facts)

    def verify_facts(
        self, profile_id: uuid.UUID, request: FactVerificationRequest
    ) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        if request.source_comparison_resolved is not None:
            profile.source_comparison_resolved = request.source_comparison_resolved

        for change in request.facts:
            fact = self._get_current_fact(profile.id, self._uuid(change.fact_id, "fact_id"))
            if change.value is not None and change.value != fact.fact_value:
                fact.is_current = False
                corrected = ProfileFact(
                    profile_id=fact.profile_id,
                    parse_run_id=fact.parse_run_id,
                    source_document_id=fact.source_document_id,
                    supersedes_fact_id=fact.id,
                    category=fact.category,
                    fact_key=fact.fact_key,
                    fact_value=change.value,
                    confidence=fact.confidence,
                    verified=False,
                    provenance={**fact.provenance, "source": "user_correction"},
                    page_number=fact.page_number,
                    bounding_box=fact.bounding_box,
                    element_ids=fact.element_ids,
                    correction_version=fact.correction_version + 1,
                    is_current=True,
                )
                self.session.add(corrected)
            else:
                fact.verified = change.verified

        self.session.flush()
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        self.session.flush()
        return self._response(profile, facts)

    def add_fact(self, profile_id: uuid.UUID, request: FactCreateRequest) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        # A ProfileFact needs a parse_run + source_document (both non-null); reuse
        # the profile's most recent parse so user-added facts satisfy the FKs.
        parse_run = self.session.scalar(
            select(ParseRun)
            .join(SourceDocument, ParseRun.source_document_id == SourceDocument.id)
            .where(SourceDocument.profile_id == profile_id)
            .order_by(ParseRun.created_at.desc())
        )
        if parse_run is None:
            raise DomainError(
                status_code=422,
                code="NO_PARSED_DOCUMENT",
                message="Upload and parse a resume before adding entries.",
            )
        base_key = request.key.strip() or request.category.strip()
        existing = {f.fact_key for f in self._current_facts(profile_id) if f.category == request.category.strip()}
        key = base_key
        suffix = 2
        while key in existing:
            key = f"{base_key}_{suffix}"
            suffix += 1
        fact = ProfileFact(
            profile_id=profile.id,
            parse_run_id=parse_run.id,
            source_document_id=parse_run.source_document_id,
            category=request.category.strip(),
            fact_key=key,
            fact_value=request.value.strip(),
            confidence=None,
            verified=False,
            provenance={"source": "user_added"},
            page_number=None,
            bounding_box=[],
            element_ids=[],
            correction_version=0,
            is_current=True,
        )
        self.session.add(fact)
        self.session.flush()
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        self.session.flush()
        return self._response(profile, facts)

    def set_default(self, profile_id: uuid.UUID) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        if not profile.is_default:
            # Clear the existing default before setting the new one so the
            # single-default unique index is never transiently violated.
            self.session.execute(
                update(Profile).where(Profile.is_default.is_(True)).values(is_default=False)
            )
            self.session.flush()
            profile.is_default = True
            self.session.flush()
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        return self._response(profile, facts)

    def delete(self, profile_id: uuid.UUID) -> None:
        # Hard-delete: every FK to profiles.id is ON DELETE CASCADE (verified in
        # the schema) and there are no ORM relationships to intercept, so a bare
        # DELETE removes the profile and all its documents/parse-runs/facts/
        # matches/applications/tracked rows in one shot.
        profile = self._get_profile(profile_id)
        was_default = profile.is_default
        self.session.delete(profile)
        self.session.flush()
        # Keep a default around: promote the most-recent remaining profile.
        if was_default:
            successor = self.session.scalar(
                select(Profile)
                .order_by(Profile.updated_at.desc(), Profile.created_at.desc())
            )
            if successor is not None:
                successor.is_default = True
                self.session.flush()

    def delete_fact(self, profile_id: uuid.UUID, fact_id: uuid.UUID) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        fact = self._get_current_fact(profile.id, fact_id)
        fact.is_current = False
        self.session.flush()
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        self.session.flush()
        return self._response(profile, facts)

    def _get_profile(self, profile_id: uuid.UUID) -> Profile:
        profile = self.session.get(Profile, profile_id)
        if profile is None:
            raise DomainError(
                status_code=404,
                code="PROFILE_NOT_FOUND",
                message="The requested profile was not found.",
            )
        return profile

    def _get_current_fact(self, profile_id: uuid.UUID, fact_id: uuid.UUID) -> ProfileFact:
        fact = self.session.scalar(
            select(ProfileFact).where(
                ProfileFact.id == fact_id,
                ProfileFact.profile_id == profile_id,
                ProfileFact.is_current.is_(True),
            )
        )
        if fact is None:
            raise DomainError(
                status_code=404,
                code="PROFILE_FACT_NOT_FOUND",
                message="The requested current profile fact was not found.",
            )
        return fact

    def _current_facts(self, profile_id: uuid.UUID) -> list[ProfileFact]:
        return list(
            self.session.scalars(
                select(ProfileFact)
                .where(
                    ProfileFact.profile_id == profile_id,
                    ProfileFact.is_current.is_(True),
                )
                .order_by(ProfileFact.category, ProfileFact.fact_key, ProfileFact.created_at)
            )
        )

    @staticmethod
    def _refresh_readiness(profile: Profile, facts: list[ProfileFact]) -> None:
        if profile.status == RecordStatus.failed:
            profile.readiness = ProfileReadiness.parse_failed
        elif not facts:
            profile.readiness = ProfileReadiness.uploaded
        elif profile.source_comparison_resolved and all(fact.verified for fact in facts):
            profile.readiness = ProfileReadiness.ready
        else:
            profile.readiness = ProfileReadiness.needs_review

    def _response(self, profile: Profile, facts: list[ProfileFact]) -> ProfileResponse:
        # The profile's current resume = the most recently uploaded source document.
        source_filename = self.session.scalar(
            select(SourceDocument.filename)
            .where(SourceDocument.profile_id == profile.id)
            .order_by(SourceDocument.created_at.desc())
        )
        operation = self.session.scalar(
            select(Operation)
            .where(
                Operation.profile_id == profile.id,
                Operation.operation_type == "parse_document",
            )
            .order_by(Operation.created_at.desc())
        )
        processing = None
        if operation is not None:
            stage = operation.stage
            if stage is None:
                stage = (
                    OperationStage.complete
                    if operation.status.value == "succeeded"
                    else OperationStage.failed
                    if operation.status.value == "failed"
                    else OperationStage.reading
                )
            source_document_id = operation.payload.get("source_document_id")
            now = datetime.now(timezone.utc)
            stage_timings: dict[str, ProfileStageTiming] = {}
            for timing_stage, raw_timing in operation.payload.get("stage_timings", {}).items():
                if not isinstance(raw_timing, dict) or not raw_timing.get("started_at"):
                    continue
                timing_started = datetime.fromisoformat(str(raw_timing["started_at"]))
                timing_completed = (
                    datetime.fromisoformat(str(raw_timing["completed_at"]))
                    if raw_timing.get("completed_at")
                    else None
                )
                stage_timings[str(timing_stage)] = ProfileStageTiming(
                    started_at=timing_started,
                    completed_at=timing_completed,
                    duration_ms=(
                        int(raw_timing.get("duration_ms", 0))
                        if timing_completed
                        else max(0, round((now - timing_started).total_seconds() * 1000))
                    ),
                )
            processing = ProfileProcessing(
                operation_id=str(operation.id),
                source_document_id=str(source_document_id) if source_document_id else None,
                status=operation.status.value,
                stage=stage.value,
                error_code=operation.error_code,
                retryable=operation.status.value == "failed",
                started_at=operation.started_at,
                completed_at=operation.completed_at,
                stage_timings=stage_timings,
            )
        return ProfileResponse(
            id=str(profile.id),
            display_name=profile.display_name,
            email=profile.email,
            readiness=profile.readiness.value,
            source_comparison_resolved=profile.source_comparison_resolved,
            is_default=profile.is_default,
            source_filename=source_filename,
            processing=processing,
            ai_preferences=profile.ai_preferences,
            contact=profile.contact,
            application_defaults=profile.application_defaults,
            socials=profile.socials,
            custom_sections=profile.custom_sections,
            facts=[
                CandidateFact(
                    id=str(fact.id),
                    category=fact.category,
                    key=fact.fact_key,
                    value=fact.fact_value,
                    confidence=float(fact.confidence) if fact.confidence is not None else None,
                    verified=fact.verified,
                    correction_version=fact.correction_version,
                    source=SourceReference(
                        document_id=str(fact.source_document_id),
                        page=fact.page_number,
                        bounding_box=fact.bounding_box,
                        element_ids=fact.element_ids,
                    ),
                )
                for fact in facts
            ],
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    @staticmethod
    def _uuid(value: str, field: str) -> uuid.UUID:
        try:
            return uuid.UUID(value)
        except ValueError as error:
            raise DomainError(
                status_code=422,
                code="INVALID_IDENTIFIER",
                message=f"{field} must be a valid UUID.",
            ) from error
