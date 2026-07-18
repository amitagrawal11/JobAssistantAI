from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import create_engine, text

from app.config import get_settings


router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    with create_engine(settings.database_url).connect() as connection:
        connection.execute(text("SELECT 1"))
    settings.storage_root.mkdir(parents=True, exist_ok=True)
    probe = settings.storage_root / ".healthcheck"
    probe.write_text("ok", encoding="utf-8")
    probe.unlink()
    return {
        "status": "ok",
        "database": "ok",
        "storage": "ok",
        "version": "0.1.0",
    }


@router.get("/api/config-check")
def config_check() -> dict[str, str]:
    return {"status": "ok"}
