from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class NormalizedPosting:
    vendor: str
    vendor_job_id: str
    company: str
    title: str
    team: str | None
    location: str | None
    commitment: str | None
    hosted_url: str
    apply_url: str | None
    posted_at: datetime | None


class AtsConnector(Protocol):
    vendor: str

    def fetch_postings(self) -> list[NormalizedPosting]:
        """Fetch every active posting this connector is responsible for."""
