from __future__ import annotations

from app.ats.ashby import AshbyConnector
from app.ats.base import AtsConnector
from app.ats.greenhouse import GreenhouseConnector
from app.ats.lever import LeverConnector
from app.ats.smartrecruiters import SmartRecruitersConnector
from app.config import Settings


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def build_connectors(settings: Settings) -> list[AtsConnector]:
    connectors: list[AtsConnector] = []
    lever_companies = _split(settings.lever_companies)
    if lever_companies:
        connectors.append(LeverConnector(lever_companies))
    greenhouse_companies = _split(settings.greenhouse_companies)
    if greenhouse_companies:
        connectors.append(GreenhouseConnector(greenhouse_companies))
    ashby_companies = _split(settings.ashby_companies)
    if ashby_companies:
        connectors.append(AshbyConnector(ashby_companies))
    smartrecruiters_companies = _split(settings.smartrecruiters_companies)
    if smartrecruiters_companies:
        connectors.append(SmartRecruitersConnector(smartrecruiters_companies))
    return connectors
