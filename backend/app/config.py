from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str
    storage_root: Path
    development_bearer_token: str
    extension_origin_regex: str = r"^chrome-extension://[a-p]{32}$"
    ai_provider: str = "ollama"
    openai_api_key: str = ""
    openai_models: str = ""
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_models: str = ""

    @field_validator("development_bearer_token")
    @classmethod
    def token_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("DEVELOPMENT_BEARER_TOKEN cannot be blank")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
