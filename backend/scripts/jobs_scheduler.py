"""Standalone entrypoint for the job postings ATS sync.

Runs one sync pass against every configured vendor (Lever, Greenhouse, Ashby,
SmartRecruiters, ...) and exits. Intended to be triggered by an external
scheduler (cron, a Kubernetes CronJob, launchd, etc.) rather than kept
running as a long-lived process.

Usage:
    python scripts/jobs_scheduler.py

Suggested daily cron entry (inside the api container):
    0 3 * * * docker compose exec -T api python scripts/jobs_scheduler.py
"""

from __future__ import annotations

import logging
import sys

from app.ats.scheduler import run_sync_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def main() -> int:
    result = run_sync_once()
    if result is None:
        return 1
    return 1 if result.vendors_failed and not result.vendors_synced else 0


if __name__ == "__main__":
    sys.exit(main())
