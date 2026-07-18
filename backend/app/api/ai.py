from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.db.entities import Profile
from app.db.session import get_session
from app.errors import DomainError
from app.models.ai import (
    AgentRequest,
    AiPreferenceRequest,
    AiPreferenceResponse,
    ConnectionCheck,
    ProviderId,
    ProviderListResponse,
    ProviderTestRequest,
    ProviderTestResponse,
)


router = APIRouter(tags=["ai"])


def registry() -> ProviderRegistry:
    return ProviderRegistry(get_settings())


@router.get("/ai/providers", response_model=ProviderListResponse)
def list_providers() -> ProviderListResponse:
    return ProviderListResponse(providers=registry().list())


@router.post("/ai/providers/{provider}/test", response_model=ProviderTestResponse)
def test_provider(provider: ProviderId, request: ProviderTestRequest) -> ProviderTestResponse:
    selected = registry().get(provider)
    info = selected.info(request.model)
    if request.model not in info.models:
        raise DomainError(
            status_code=422,
            code="AI_MODEL_UNAVAILABLE",
            message="The selected model is not available for this provider.",
        )
    try:
        selected.run_structured(
            AgentRequest(
                role="critic",
                provider=provider,
                model=request.model,
                prompt_version="connection-v1",
                schema_version="connection-v1",
                inputs={"instruction": "Return status ok."},
            ),
            ConnectionCheck,
        )
    except Exception as error:
        raise DomainError(
            status_code=503,
            code="AI_PROVIDER_UNAVAILABLE",
            message="The provider connection check failed.",
            retryable=True,
        ) from error
    return ProviderTestResponse(provider=provider, model=request.model, ok=True, message="Connection successful.")


@router.patch("/profiles/{profile_id}/ai-preferences", response_model=AiPreferenceResponse)
def save_ai_preferences(
    profile_id: str,
    request: AiPreferenceRequest,
    session: Session = Depends(get_session),
) -> AiPreferenceResponse:
    try:
        identifier = uuid.UUID(profile_id)
    except ValueError as error:
        raise DomainError(status_code=422, code="INVALID_IDENTIFIER", message="profile_id must be a valid UUID.") from error
    profile = session.get(Profile, identifier)
    if profile is None:
        raise DomainError(status_code=404, code="PROFILE_NOT_FOUND", message="The requested profile was not found.")
    info = registry().get(request.provider).info(request.model)
    if request.model not in info.models:
        raise DomainError(status_code=422, code="AI_MODEL_UNAVAILABLE", message="The selected model is not available for this provider.")
    profile.ai_preferences = {"provider": request.provider, "model": request.model}
    session.flush()
    return AiPreferenceResponse(**profile.ai_preferences)
