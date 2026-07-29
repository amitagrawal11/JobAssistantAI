from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import Field, model_validator

from app.models.common import ApiModel


class JobPostingOutput(ApiModel):
    id: str
    vendor: str
    company: str
    title: str
    team: str | None
    location: str | None
    commitment: str | None
    hosted_url: str
    apply_url: str | None
    posted_at: datetime | None
    is_active: bool
    workplace_type: str = "unknown"
    employment_type: str = "unknown"
    role_category: str = "other"
    experience_level: str = "unknown"
    max_experience: str = "unknown"
    degree_level: str = "none_mentioned"
    sponsorship: str = "unknown"
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    industry: str = "unknown"
    travel: str = "unknown"
    enrichment_evidence: list[dict] = Field(default_factory=list)
    saved: bool = False
    dismissed: bool = False
    match_score: float | None = None
    match_level: str | None = None
    missing_critical_skills: int | None = None


class JobPostingListResponse(ApiModel):
    items: list[JobPostingOutput]
    total: int
    page: int
    page_size: int


class JobPostingSyncResponse(ApiModel):
    vendors_synced: list[str]
    vendors_failed: list[str]
    postings_seen: int
    postings_created: int
    postings_updated: int
    postings_deactivated: int


class QuickApplyRequest(ApiModel):
    profile_id: str
    phone: str | None = None
    comments: str | None = None


class QuickApplyResponse(ApiModel):
    status: str


class JobPostingSort(str, Enum):
    newest = "newest"
    oldest = "oldest"
    company_asc = "company_asc"
    company_desc = "company_desc"
    best_match = "best_match"


class JobPostingFilters(ApiModel):
    include: list[str] = Field(default_factory=list)
    exclude: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    workplace_types: list[str] = Field(default_factory=list)
    companies: list[str] = Field(default_factory=list)
    role_categories: list[str] = Field(default_factory=list)
    employment_types: list[str] = Field(default_factory=list)
    experience_levels: list[str] = Field(default_factory=list)
    application_methods: list[str] = Field(default_factory=list)
    vendors: list[str] = Field(default_factory=list)
    sponsorship: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    profile_id: str | None = None
    match_levels: list[str] = Field(default_factory=list)
    hide_applied: bool = False
    hide_dismissed: bool = False
    saved_only: bool = False
    analyzed_only: bool = False
    auto_apply_eligible: bool = False
    sort: JobPostingSort = JobPostingSort.newest

    @property
    def uses_candidate_filters(self) -> bool:
        return bool(
            self.match_levels or self.hide_applied or self.hide_dismissed or self.saved_only
            or self.analyzed_only or self.auto_apply_eligible or self.sort == JobPostingSort.best_match
        )

    @model_validator(mode="after")
    def validate_profile(self):
        if self.uses_candidate_filters and not self.profile_id:
            raise ValueError("profile_id is required for candidate-aware filters")
        return self


class FacetOption(ApiModel):
    value: str
    label: str
    count: int


class JobPostingFacetResponse(ApiModel):
    facets: dict[str, list[FacetOption]]


class CandidateJobStatePatch(ApiModel):
    saved: bool | None = None
    dismissed: bool | None = None

    @model_validator(mode="after")
    def mutually_exclusive(self):
        if self.saved is True and self.dismissed is True:
            raise ValueError("A job cannot be saved and dismissed at the same time")
        return self


class CandidateJobStateResponse(ApiModel):
    job_posting_id: str
    profile_id: str
    saved: bool
    dismissed: bool
