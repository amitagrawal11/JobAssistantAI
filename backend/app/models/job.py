from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from app.models.common import ApiModel


RequirementCategory = Literal[
    "hard_requirements",
    "required_skills",
    "relevant_experience",
    "responsibilities",
    "seniority_title",
    "education_certifications",
    "semantic_alignment",
]


class JobRequirementOutput(ApiModel):
    requirement_id: str = Field(min_length=1, max_length=80)
    category: RequirementCategory
    required: bool
    hard_gate: bool
    normalized_text: str = Field(min_length=1, max_length=1000)
    evidence_text: str = Field(min_length=1, max_length=2000)
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)

    @model_validator(mode="after")
    def valid_offsets(self):
        if self.evidence_end <= self.evidence_start:
            raise ValueError("evidence_end must be greater than evidence_start")
        return self


class JobAnalystOutput(ApiModel):
    title: str = Field(min_length=1, max_length=240)
    company: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    requirements: list[JobRequirementOutput] = Field(min_length=1, max_length=80)


class JobAnalyzeRequest(ApiModel):
    profile_id: str
    title: str = Field(min_length=1, max_length=240)
    company: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    source_url: str | None = Field(default=None, max_length=2000)
    description: str = Field(min_length=20, max_length=100_000)


class JobAnalyzeResponse(ApiModel):
    job_id: str
    operation_id: str
    profile_id: str
    title: str
    company: str | None
    location: str | None
    source_url: str | None
    description: str
    requirements: list[JobRequirementOutput]
    provider: str
    model: str
    prompt_version: str
