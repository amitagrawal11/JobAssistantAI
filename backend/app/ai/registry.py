from __future__ import annotations

from app.ai.ollama_provider import OllamaProvider
from app.ai.openai_provider import OpenAiProvider
from app.config import Settings
from app.models.ai import ProviderId


def _models(value: str) -> list[str]:
    return [model.strip() for model in value.split(",") if model.strip()]


class ProviderRegistry:
    def __init__(self, settings: Settings) -> None:
        self.providers = {
            "ollama": OllamaProvider(settings.ollama_base_url, _models(settings.ollama_models)),
            "openai": OpenAiProvider(settings.openai_api_key, _models(settings.openai_models)),
        }

    def get(self, provider: ProviderId):
        return self.providers[provider]

    def list(self, selected: dict[str, str] | None = None):
        selected = selected or {}
        return [provider.info(selected.get(provider_id)) for provider_id, provider in self.providers.items()]
