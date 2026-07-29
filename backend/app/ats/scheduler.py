from __future__ import annotations

import logging

from app.ats.registry import build_connectors
from app.ats.sync_service import AtsSyncResult, AtsSyncService
from app.config import get_settings
from app.db.session import get_session_factory

logger = logging.getLogger(__name__)


def run_sync_once() -> AtsSyncResult | None:
    """Run a single ATS sync pass and persist results. Safe to call from a
    request handler, a background loop, or a standalone script/cron job."""
    connectors = build_connectors(get_settings())
    if not connectors:
        logger.warning("ats_sync_skipped reason=no_connectors_configured")
        return None
    with get_session_factory()() as session, session.begin():
        result = AtsSyncService(session).sync_all(connectors)
    logger.info(
        "ats_sync_complete synced=%s failed=%s seen=%s created=%s updated=%s deactivated=%s",
        result.vendors_synced, result.vendors_failed, result.postings_seen,
        result.postings_created, result.postings_updated, result.postings_deactivated,
    )
    return result
