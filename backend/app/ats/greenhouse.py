from __future__ import annotations

from datetime import datetime

import httpx

from app.ats.base import NormalizedPosting
from app.ats.normalization import (
    html_to_text, normalize_employment_type, normalize_experience_level,
    normalize_role_category, normalize_workplace_type, source_fingerprint,
)


class GreenhouseConnector:
    vendor = "greenhouse"

    def __init__(self, companies: list[str], client: httpx.Client | None = None) -> None:
        self.companies = companies
        self._client = client or httpx.Client(timeout=30.0)

    def fetch_postings(self) -> list[NormalizedPosting]:
        postings: list[NormalizedPosting] = []
        for company in self.companies:
            postings.extend(self._fetch_company(company))
        return postings

    def _fetch_company(self, company: str) -> list[NormalizedPosting]:
        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                response = self._client.get(
                    f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs",
                    params={"content": "true"},
                )
                break
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == 2:
                    raise
        assert response is not None
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs") if isinstance(payload, dict) else None
        if not isinstance(jobs, list):
            return []
        return [self._normalize(company, item) for item in jobs if isinstance(item, dict)]

    @staticmethod
    def _normalize(company: str, item: dict) -> NormalizedPosting:
        location = item.get("location") or {}
        departments = item.get("departments") or []
        team = departments[0].get("name") if departments and isinstance(departments[0], dict) else None
        title = str(item.get("title", ""))
        description_html = item.get("content")
        description_text = html_to_text(description_html)
        posted_at = GreenhouseConnector._parse_datetime(item.get("first_published") or item.get("updated_at"))
        return NormalizedPosting(
            vendor="greenhouse",
            vendor_job_id=str(item.get("id")),
            company=item.get("company_name") or company,
            title=title,
            team=team,
            location=location.get("name"),
            commitment=None,
            hosted_url=str(item.get("absolute_url", "")),
            apply_url=None,
            posted_at=posted_at,
            description_text=description_text,
            description_html=description_html,
            source_language=item.get("language"),
            source_department=team,
            workplace_type=normalize_workplace_type(None, location.get("name")),
            employment_type=normalize_employment_type(None),
            role_category=normalize_role_category(title, team),
            experience_level=normalize_experience_level(title),
            source_fingerprint=source_fingerprint(title, location.get("name"), description_text),
        )

    @staticmethod
    def _parse_datetime(value: object) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
