from __future__ import annotations

from typing import Any, TypeVar

from ollama import Client
from pydantic import BaseModel

from app.models.ai import AgentProvenance, AgentRequest, AgentResult, ProviderInfo


OutputT = TypeVar("OutputT", bound=BaseModel)

_UNSUPPORTED_SCHEMA_KEYS = {
    "default",
    "exclusiveMaximum",
    "exclusiveMinimum",
    "maxItems",
    "maxLength",
    "maximum",
    "minItems",
    "minLength",
    "minimum",
    "title",
}


def _strip_unsupported_schema_keys(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            if key in {"properties", "$defs"} and isinstance(item, dict):
                cleaned[key] = {
                    name: _strip_unsupported_schema_keys(definition)
                    for name, definition in item.items()
                }
            elif key not in _UNSUPPORTED_SCHEMA_KEYS:
                cleaned[key] = _strip_unsupported_schema_keys(item)
        return cleaned
    if isinstance(value, list):
        return [_strip_unsupported_schema_keys(item) for item in value]
    return value


def ollama_compatible_schema(output_type: type[BaseModel]) -> dict[str, Any]:
    """Keep structural validation while removing grammar-unsupported annotations."""
    return _strip_unsupported_schema_keys(output_type.model_json_schema())


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
            format=ollama_compatible_schema(output_type),
            stream=False,
            think=False,
            options={
                "temperature": 0,
                "num_predict": 32 if request.prompt_version == "connection-v1" else 2048,
            },
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
