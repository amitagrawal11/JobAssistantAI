from __future__ import annotations

from datetime import datetime

import httpx

from app.ats.base import NormalizedPosting

_PAGE_SIZE = 100


class SmartRecruitersConnector:
    vendor = "smartrecruiters"

    def __init__(self, companies: list[str], client: httpx.Client | None = None) -> None:
        self.companies = companies
        self._client = client or httpx.Client(timeout=15.0)

    def fetch_postings(self) -> list[NormalizedPosting]:
        postings: list[NormalizedPosting] = []
        for company in self.companies:
            postings.extend(self._fetch_company(company))
        return postings

    def _fetch_company(self, company: str) -> list[NormalizedPosting]:
        postings: list[NormalizedPosting] = []
        offset = 0
        while True:
            response = self._client.get(
                f"https://api.smartrecruiters.com/v1/companies/{company}/postings",
                params={"limit": _PAGE_SIZE, "offset": offset},
            )
            response.raise_for_status()
            payload = response.json()
            content = payload.get("content") if isinstance(payload, dict) else None
            if not isinstance(content, list) or not content:
                break
            postings.extend(self._normalize(company, item) for item in content if isinstance(item, dict))
            offset += _PAGE_SIZE
            if offset >= payload.get("totalFound", 0):
                break
        return postings

    @staticmethod
    def _normalize(company: str, item: dict) -> NormalizedPosting:
        location = item.get("location") or {}
        department = item.get("department") or {}
        employment = item.get("typeOfEmployment") or {}
        job_id = str(item.get("id"))
        posted_at = SmartRecruitersConnector._parse_datetime(item.get("releasedDate"))
        return NormalizedPosting(
            vendor="smartrecruiters",
            vendor_job_id=job_id,
            company=(item.get("company") or {}).get("name") or company,
            title=str(item.get("name", "")),
            team=department.get("label"),
            location=location.get("fullLocation"),
            commitment=employment.get("label"),
            hosted_url=f"https://jobs.smartrecruiters.com/{company}/{job_id}",
            apply_url=None,
            posted_at=posted_at,
        )

    @staticmethod
    def _parse_datetime(value: object) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
