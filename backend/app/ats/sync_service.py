from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ats.base import AtsConnector, NormalizedPosting
from app.db.entities import JobPosting

logger = logging.getLogger(__name__)


class AtsSyncResult:
    def __init__(self) -> None:
        self.vendors_synced: list[str] = []
        self.vendors_failed: list[str] = []
        self.postings_seen = 0
        self.postings_created = 0
        self.postings_updated = 0
        self.postings_deactivated = 0


class AtsSyncService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def sync_all(self, connectors: list[AtsConnector]) -> AtsSyncResult:
        result = AtsSyncResult()
        for connector in connectors:
            try:
                postings = connector.fetch_postings()
            except Exception:
                logger.exception("ATS sync failed for vendor=%s", connector.vendor)
                result.vendors_failed.append(connector.vendor)
                continue
            self._upsert(connector.vendor, postings, result)
            result.vendors_synced.append(connector.vendor)
        self.session.flush()
        return result

    def _upsert(self, vendor: str, postings: list[NormalizedPosting], result: AtsSyncResult) -> None:
        now = datetime.now(timezone.utc)
        seen_job_ids: set[str] = set()
        existing = {
            row.vendor_job_id: row
            for row in self.session.scalars(select(JobPosting).where(JobPosting.vendor == vendor))
        }
        for posting in postings:
            result.postings_seen += 1
            seen_job_ids.add(posting.vendor_job_id)
            row = existing.get(posting.vendor_job_id)
            if row is None:
                self.session.add(JobPosting(
                    vendor=posting.vendor,
                    vendor_job_id=posting.vendor_job_id,
                    company=posting.company,
                    title=posting.title,
                    team=posting.team,
                    location=posting.location,
                    commitment=posting.commitment,
                    hosted_url=posting.hosted_url,
                    apply_url=posting.apply_url,
                    posted_at=posting.posted_at,
                    is_active=True,
                    last_seen_at=now,
                ))
                result.postings_created += 1
            else:
                row.company = posting.company
                row.title = posting.title
                row.team = posting.team
                row.location = posting.location
                row.commitment = posting.commitment
                row.hosted_url = posting.hosted_url
                row.apply_url = posting.apply_url
                row.posted_at = posting.posted_at
                row.is_active = True
                row.last_seen_at = now
                result.postings_updated += 1
        for job_id, row in existing.items():
            if job_id not in seen_job_ids and row.is_active:
                row.is_active = False
                result.postings_deactivated += 1
