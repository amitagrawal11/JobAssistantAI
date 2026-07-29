from __future__ import annotations

from datetime import datetime

import httpx

from app.ats.base import NormalizedPosting


class AshbyConnector:
    vendor = "ashby"

    def __init__(self, companies: list[str], client: httpx.Client | None = None) -> None:
        self.companies = companies
        self._client = client or httpx.Client(timeout=15.0)

    def fetch_postings(self) -> list[NormalizedPosting]:
        postings: list[NormalizedPosting] = []
        for company in self.companies:
            postings.extend(self._fetch_company(company))
        return postings

    def _fetch_company(self, company: str) -> list[NormalizedPosting]:
        response = self._client.get(f"https://api.ashbyhq.com/posting-api/job-board/{company}")
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs") if isinstance(payload, dict) else None
        if not isinstance(jobs, list):
            return []
        return [self._normalize(company, item) for item in jobs if isinstance(item, dict)]

    @staticmethod
    def _normalize(company: str, item: dict) -> NormalizedPosting:
        posted_at = AshbyConnector._parse_datetime(item.get("publishedAt"))
        return NormalizedPosting(
            vendor="ashby",
            vendor_job_id=str(item.get("id")),
            company=company,
            title=str(item.get("title", "")).strip(),
            team=item.get("team") or item.get("department"),
            location=item.get("location"),
            commitment=item.get("employmentType"),
            hosted_url=str(item.get("jobUrl", "")),
            apply_url=item.get("applyUrl"),
            posted_at=posted_at,
        )

    @staticmethod
    def _parse_datetime(value: object) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
