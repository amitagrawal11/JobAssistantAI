from __future__ import annotations

import enum

from pydantic import Field

from app.models.common import ApiModel
from app.models.job import RequirementCategory


class EvidenceClassification(str, enum.Enum):
    matched = "matched"
    partial = "partial"
    missing = "missing"
    unknown = "unknown"


class RequirementEvidence(ApiModel):
    requirement_id: str
    classification: EvidenceClassification
    source_fact_ids: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1, max_length=2000)
    confidence: float = Field(ge=0, le=1)


class CandidateEvidenceOutput(ApiModel):
    evaluations: list[RequirementEvidence]


class MatchItem(ApiModel):
    requirement_id: str
    requirement: str
    category: RequirementCategory
    classification: EvidenceClassification
    source_fact_ids: list[str] = Field(default_factory=list)
    reason: str
    confidence: float
    score_contribution: float
    hard_gate: bool


class AggregatedMatch(ApiModel):
    score: float
    scoring_version: str
    components: dict[str, float]
    hard_gate_failures: list[str]
    items: list[MatchItem]


class MatchScoreRequest(ApiModel):
    profile_id: str
    job_id: str


class MatchScoreResponse(AggregatedMatch):
    match_id: str
    operation_id: str
    profile_id: str
    job_id: str
    provider: str
    model: str
    prompt_version: str
