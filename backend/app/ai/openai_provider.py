from __future__ import annotations

from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.models.ai import AgentProvenance, AgentRequest, AgentResult, ProviderInfo


OutputT = TypeVar("OutputT", bound=BaseModel)


class OpenAiProvider:
    def __init__(self, api_key: str, allowed_models: list[str]) -> None:
        self.api_key = api_key
        self.allowed_models = allowed_models
        self.client = OpenAI(api_key=api_key) if api_key else None

    def info(self, selected_model: str | None = None) -> ProviderInfo:
        configured = bool(self.client and self.allowed_models)
        return ProviderInfo(
            id="openai",
            label="OpenAI",
            available=configured,
            models=self.allowed_models if configured else [],
            selected_model=selected_model if configured and selected_model in self.allowed_models else None,
            status="available" if configured else "not_configured",
        )

    def run_structured(self, request: AgentRequest, output_type: type[OutputT]) -> AgentResult[OutputT]:
        if not self.client or request.model not in self.allowed_models:
            raise ValueError("The selected OpenAI model is not configured.")
        response = self.client.responses.parse(
            model=request.model,
            input=[
                {"role": "system", "content": f"Role: {request.role}. Return only the requested schema."},
                {"role": "user", "content": str(request.inputs)},
            ],
            text_format=output_type,
        )
        if response.output_parsed is None:
            raise ValueError("The provider did not return a structured result.")
        usage = {}
        if response.usage:
            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens,
            }
        return AgentResult(
            output=response.output_parsed,
            provenance=AgentProvenance(
                provider="openai",
                model=request.model,
                role=request.role,
                prompt_version=request.prompt_version,
                schema_version=request.schema_version,
                response_id=response.id,
                usage=usage,
            ),
        )
