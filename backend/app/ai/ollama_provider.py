from __future__ import annotations

from typing import TypeVar

from ollama import Client
from pydantic import BaseModel

from app.models.ai import AgentProvenance, AgentRequest, AgentResult, ProviderInfo


OutputT = TypeVar("OutputT", bound=BaseModel)


class OllamaProvider:
    def __init__(self, base_url: str, allowed_models: list[str]) -> None:
        self.client = Client(host=base_url)
        self.allowed_models = allowed_models

    def models(self) -> list[str]:
        listed = self.client.list()
        installed = sorted(model.model for model in listed.models if model.model)
        if not self.allowed_models:
            return installed
        return [model for model in self.allowed_models if model in installed]

    def info(self, selected_model: str | None = None) -> ProviderInfo:
        try:
            models = self.models()
        except Exception:
            return ProviderInfo(id="ollama", label="Ollama", available=False, models=[], status="unavailable")
        return ProviderInfo(
            id="ollama",
            label="Ollama",
            available=bool(models),
            models=models,
            selected_model=selected_model if selected_model in models else None,
            status="available" if models else "no_models",
        )

    def run_structured(self, request: AgentRequest, output_type: type[OutputT]) -> AgentResult[OutputT]:
        if request.model not in self.models():
            raise ValueError("The selected Ollama model is not installed or allowlisted.")
        response = self.client.chat(
            model=request.model,
            messages=[
                {"role": "system", "content": f"Role: {request.role}. Return only the requested schema."},
                {"role": "user", "content": str(request.inputs)},
            ],
            format=output_type.model_json_schema(),
            stream=False,
            think=False,
            options={"temperature": 0, "num_predict": 32},
        )
        output = output_type.model_validate_json(response.message.content)
        return AgentResult(
            output=output,
            provenance=AgentProvenance(
                provider="ollama",
                model=request.model,
                role=request.role,
                prompt_version=request.prompt_version,
                schema_version=request.schema_version,
            ),
        )
