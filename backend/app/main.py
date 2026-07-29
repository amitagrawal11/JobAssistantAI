from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.profiles import router as profiles_router
from app.api.source_preview import router as source_preview_router
from app.api.operations import router as operations_router
from app.api.ai import router as ai_router
from app.api.jobs import router as jobs_router
from app.api.job_postings import router as job_postings_router
from app.api.matches import router as matches_router
from app.api.tailoring import router as tailoring_router
from app.api.applications import router as applications_router
from app.api.auto_apply import router as auto_apply_router
from app.api.overview import router as overview_router
from app.ats.scheduler import run_sync_once
from app.config import get_settings
from app.errors import DomainError, domain_error_response
from app.security import DevelopmentBearerTokenMiddleware
from app.documents.docling_parser import DoclingParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _ats_sync_loop(interval_seconds: int) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await asyncio.to_thread(run_sync_once)
        except Exception:
            logger.exception("ats_sync_loop_iteration_failed")


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.document_parser = DoclingParser()
    # Load docling models into memory in the background so the first resume
    # upload doesn't pay the model-initialization cost.
    asyncio.create_task(asyncio.to_thread(application.state.document_parser.warmup))
    settings = get_settings()
    if settings.ats_sync_on_startup:
        asyncio.create_task(asyncio.to_thread(run_sync_once))
    sync_task = asyncio.create_task(_ats_sync_loop(settings.ats_sync_interval_seconds))
    try:
        yield
    finally:
        sync_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await sync_task


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
    application.include_router(ai_router)
    application.include_router(jobs_router)
    application.include_router(job_postings_router)
    application.include_router(matches_router)
    application.include_router(tailoring_router)
    application.include_router(applications_router)
    application.include_router(auto_apply_router)
    application.include_router(overview_router)
    return application


app = create_app()
