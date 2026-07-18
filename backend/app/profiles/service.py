from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.entities import Profile, ProfileFact, ProfileReadiness, RecordStatus
from app.errors import DomainError
from app.models.common import SourceReference
from app.models.profile import (
    CandidateFact,
    FactVerificationRequest,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
)


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
        return self._response(profile, [])

    def get(self, profile_id: uuid.UUID) -> ProfileResponse:
        profile = self._get_profile(profile_id)
        facts = self._current_facts(profile.id)
        self._refresh_readiness(profile, facts)
        return self._response(profile, facts)

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

    @staticmethod
    def _response(profile: Profile, facts: list[ProfileFact]) -> ProfileResponse:
        return ProfileResponse(
            id=str(profile.id),
            display_name=profile.display_name,
            email=profile.email,
            readiness=profile.readiness.value,
            source_comparison_resolved=profile.source_comparison_resolved,
            ai_preferences=profile.ai_preferences,
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
