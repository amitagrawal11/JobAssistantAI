from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.profiles import router as profiles_router
from app.config import get_settings
from app.errors import DomainError, domain_error_response
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
    application.add_exception_handler(
        DomainError,
        lambda _request, error: domain_error_response(error),
    )
    application.include_router(health_router)
    application.include_router(profiles_router)
    application.include_router(documents_router)
    return application


app = create_app()
