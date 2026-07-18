from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.profiles import router as profiles_router
from app.api.source_preview import router as source_preview_router
from app.api.operations import router as operations_router
from app.config import get_settings
from app.errors import DomainError, domain_error_response
from app.security import DevelopmentBearerTokenMiddleware
from app.documents.docling_parser import DoclingParser


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.document_parser = DoclingParser()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Job Copilot API",
        version="0.1.0",
        lifespan=lifespan,
    )
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
    application.include_router(source_preview_router)
    application.include_router(operations_router)
    return application


app = create_app()
