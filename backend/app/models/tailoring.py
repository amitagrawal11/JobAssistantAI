from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.models.common import ApiModel

TailoredOperation = Literal["rewrite", "reorder", "emphasize", "remove"]
TailoredClassification = Literal["REPHRASED", "REORDERED", "EMPHASIZED", "REMOVED", "NEW_CLAIM"]
ReviewStatusValue = Literal["proposed", "approved", "rejected"]


class TailoredChangeOutput(ApiModel):
    section: str = Field(min_length=1, max_length=120)
    operation: TailoredOperation
    before: str = Field(default="", max_length=2000)
    after: str = Field(min_length=1, max_length=2000)
    classification: TailoredClassification
    reason: str = Field(min_length=1, max_length=1000)
    source_fact_ids: list[str] = Field(default_factory=list)


class TailoringAgentOutput(ApiModel):
    resume_changes: list[TailoredChangeOutput] = Field(min_length=1, max_length=60)
    cover_letter_paragraphs: list[str] = Field(min_length=1, max_length=10)
    cover_letter_source_fact_ids: list[str] = Field(default_factory=list)


class DocumentTailorRequest(ApiModel):
    profile_id: str
    job_id: str


class DocumentChangeOutput(ApiModel):
    id: str
    section: str
    operation: TailoredOperation
    before: str
    after: str
    classification: TailoredClassification
    reason: str
    source_fact_ids: list[str]
    status: ReviewStatusValue
    supported: bool


class ResumeItemOutput(ApiModel):
    id: str
    label: str
    value: str
    source_fact_ids: list[str]


class ResumeSectionOutput(ApiModel):
    id: str
    title: str
    items: list[ResumeItemOutput]


class CanonicalResumeOutput(ApiModel):
    name: str
    email: str | None
    contact: dict[str, str]
    sections: list[ResumeSectionOutput]
    template_id: str = "basic-a4-v1"
    page_size: str = "A4"

    @property
    def plain_text(self) -> str:
        return "\n".join(item.value for section in self.sections for item in section.items)


class ResumeDocumentOutput(ApiModel):
    id: str
    status: str
    changes: list[DocumentChangeOutput]
    source: CanonicalResumeOutput
    current: CanonicalResumeOutput


class CoverLetterDocumentOutput(ApiModel):
    id: str
    status: str
    paragraphs: list[str]
    source_fact_ids: list[str]


class DocumentTailorResponse(ApiModel):
    operation_id: str
    profile_id: str
    job_id: str
    resume: ResumeDocumentOutput
    cover_letter: CoverLetterDocumentOutput
    provider: str
    model: str
    prompt_version: str


class GeneratedResumeResponse(ApiModel):
    id: str
    job_id: str
    title: str
    company: str | None
    source_url: str | None
    source: CanonicalResumeOutput
    current: CanonicalResumeOutput
    changes: list[DocumentChangeOutput]


class DocumentChangeReviewRequest(ApiModel):
    status: Literal["approved", "rejected"]


class DocumentChangeReviewResponse(ApiModel):
    id: str
    status: ReviewStatusValue
