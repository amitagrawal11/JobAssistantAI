from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.config import get_settings
from app.security import DevelopmentBearerTokenMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title="Job Copilot API", version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origin_regex=settings.extension_origin_regex,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.add_middleware(DevelopmentBearerTokenMiddleware)
    application.include_router(health_router)
    return application


app = create_app()
