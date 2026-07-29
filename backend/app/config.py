from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str
    storage_root: Path
    development_bearer_token: str
    extension_origin_regex: str = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
    ai_provider: str = "ollama"
    openai_api_key: str = ""
    openai_models: str = ""
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_models: str = ""
    resume_extraction_model: str = "qwen2.5:1.5b"
    max_document_bytes: int = Field(
        default=5 * 1024 * 1024,
        gt=0,
        le=25 * 1024 * 1024,
    )
    lever_companies: str = "palantir,spotify"
    greenhouse_companies: str = (
        "stripe,airbnb,robinhood,coinbase,discord,figma,asana,gitlab,affirm,"
        "instacart,pinterest,reddit,lyft,cloudflare,elastic,databricks,scaleai,flexport"
    )
    ashby_companies: str = "ramp,notion,linear,openai,substack"
    smartrecruiters_companies: str = "DeliveryHero,Visa"
    ats_sync_interval_seconds: int = Field(default=6 * 60 * 60, gt=0)
    ats_sync_on_startup: bool = True

    @field_validator("development_bearer_token")
    @classmethod
    def token_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("DEVELOPMENT_BEARER_TOKEN cannot be blank")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
