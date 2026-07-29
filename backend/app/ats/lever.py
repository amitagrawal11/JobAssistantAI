from __future__ import annotations

from datetime import datetime, timezone

import httpx

from app.ats.base import NormalizedPosting


class LeverConnector:
    vendor = "lever"

    def __init__(self, companies: list[str], client: httpx.Client | None = None) -> None:
        self.companies = companies
        self._client = client or httpx.Client(timeout=15.0)

    def fetch_postings(self) -> list[NormalizedPosting]:
        postings: list[NormalizedPosting] = []
        for company in self.companies:
            postings.extend(self._fetch_company(company))
        return postings

    def _fetch_company(self, company: str) -> list[NormalizedPosting]:
        response = self._client.get(f"https://api.lever.co/v0/postings/{company}", params={"mode": "json"})
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            return []
        return [self._normalize(company, item) for item in payload if isinstance(item, dict)]

    @staticmethod
    def _normalize(company: str, item: dict) -> NormalizedPosting:
        categories = item.get("categories") or {}
        created_at = item.get("createdAt")
        posted_at = (
            datetime.fromtimestamp(created_at / 1000, tz=timezone.utc)
            if isinstance(created_at, (int, float))
            else None
        )
        return NormalizedPosting(
            vendor="lever",
            vendor_job_id=str(item.get("id")),
            company=company,
            title=str(item.get("text", "")),
            team=categories.get("team") or categories.get("department"),
            location=categories.get("location"),
            commitment=categories.get("commitment"),
            hosted_url=str(item.get("hostedUrl", "")),
            apply_url=item.get("applyUrl"),
            posted_at=posted_at,
        )
