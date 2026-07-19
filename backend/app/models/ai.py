from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.common import ApiModel


ProviderId = Literal["ollama", "openai"]
AgentRole = Literal["profile_extractor", "job_analyst", "candidate_evidence", "tailoring", "critic"]


class AgentRequest(ApiModel):
    role: AgentRole
    provider: ProviderId
    model: str
    prompt_version: str
    schema_version: str
    inputs: dict[str, Any]


class AgentProvenance(ApiModel):
    provider: ProviderId
    model: str
    role: AgentRole
    prompt_version: str
    schema_version: str
    response_id: str | None = None
    usage: dict[str, int] = Field(default_factory=dict)


class AgentResult[T: BaseModel](ApiModel):
    output: T
    provenance: AgentProvenance


class ConnectionCheck(BaseModel):
    status: Literal["ok"]


class ProviderInfo(ApiModel):
    id: ProviderId
    label: str
    available: bool
    models: list[str]
    selected_model: str | None = None
    status: Literal["available", "not_configured", "unavailable", "no_models"]


class ProviderListResponse(ApiModel):
    providers: list[ProviderInfo]


class ProviderTestRequest(ApiModel):
    model: str


class ProviderTestResponse(ApiModel):
    provider: ProviderId
    model: str
    ok: bool
    message: str


class AiPreferenceRequest(ApiModel):
    provider: ProviderId
    model: str


class AiPreferenceResponse(ApiModel):
    provider: ProviderId
    model: str
