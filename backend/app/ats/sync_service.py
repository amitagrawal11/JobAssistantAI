from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ats.base import AtsConnector, NormalizedPosting
from app.db.entities import JobPosting
from app.ats.enrichment import EXTRACTOR_VERSION, enrich_job_description

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
                    **self._source_values(posting),
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
                for key, value in self._source_values(posting).items():
                    setattr(row, key, value)
                result.postings_updated += 1
        for job_id, row in existing.items():
            if job_id not in seen_job_ids and row.is_active:
                row.is_active = False
                result.postings_deactivated += 1

    @staticmethod
    def _source_values(posting: NormalizedPosting) -> dict:
        values = {
            "description_text": posting.description_text,
            "description_html": posting.description_html,
            "source_language": posting.source_language,
            "source_department": posting.source_department,
            "workplace_type": posting.workplace_type,
            "employment_type": posting.employment_type,
            "role_category": posting.role_category,
            "experience_level": posting.experience_level,
            "source_fingerprint": posting.source_fingerprint,
        }
        enrichment = enrich_job_description(posting.description_text)
        values.update({
            "max_experience": enrichment.max_experience,
            "experience_min": enrichment.experience_min,
            "experience_max": enrichment.experience_max,
            "degree_level": enrichment.degree_level,
            "sponsorship": enrichment.sponsorship,
            "salary_min": enrichment.salary_min,
            "salary_max": enrichment.salary_max,
            "salary_currency": enrichment.salary_currency,
            "salary_period": enrichment.salary_period,
            "skills": enrichment.skills,
            "languages": enrichment.languages,
            "industry": enrichment.industry,
            "travel": enrichment.travel,
            "enrichment_evidence": enrichment.evidence,
            "enrichment_version": EXTRACTOR_VERSION,
        })
        return values
