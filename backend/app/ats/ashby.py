from __future__ import annotations

from datetime import datetime

import httpx

from app.ats.base import NormalizedPosting
from app.ats.normalization import (
    html_to_text, normalize_employment_type, normalize_experience_level,
    normalize_role_category, normalize_workplace_type, source_fingerprint,
)


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
        title = str(item.get("title", "")).strip()
        team = item.get("team") or item.get("department")
        description_html = item.get("descriptionHtml")
        description_text = item.get("descriptionPlain") or html_to_text(description_html)
        return NormalizedPosting(
            vendor="ashby",
            vendor_job_id=str(item.get("id")),
            company=company,
            title=title,
            team=team,
            location=item.get("location"),
            commitment=item.get("employmentType"),
            hosted_url=str(item.get("jobUrl", "")),
            apply_url=item.get("applyUrl"),
            posted_at=posted_at,
            description_text=description_text,
            description_html=description_html,
            source_department=item.get("department"),
            workplace_type=normalize_workplace_type(item.get("workplaceType"), item.get("location")),
            employment_type=normalize_employment_type(item.get("employmentType")),
            role_category=normalize_role_category(title, team),
            experience_level=normalize_experience_level(title),
            source_fingerprint=source_fingerprint(title, item.get("location"), description_text),
        )

    @staticmethod
    def _parse_datetime(value: object) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
