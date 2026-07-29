from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdentifierMixin, TimestampMixin


class RecordStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"
    archived = "archived"


class ProfileReadiness(str, enum.Enum):
    uploaded = "uploaded"
    needs_review = "needs_review"
    ready = "ready"
    parse_failed = "parse_failed"


class OperationStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class OperationStage(str, enum.Enum):
    uploading = "uploading"
    reading = "reading"
    extracting = "extracting"
    complete = "complete"
    failed = "failed"


class ReviewStatus(str, enum.Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"


class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"
    submitted = "submitted"
    interviewing = "interviewing"
    closed = "closed"


class ApplicationOutcome(str, enum.Enum):
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"


class AutoApplyStatus(str, enum.Enum):
    queued = "queued"
    awaiting_approval = "awaiting_approval"
    tailoring = "tailoring"
    submitted = "submitted"
    skipped = "skipped"


class AutoApplyPipelineStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    paused = "paused"
    completed = "completed"
    completed_with_errors = "completed_with_errors"
    cancelled = "cancelled"


class Profile(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    status: Mapped[RecordStatus] = mapped_column(
        Enum(RecordStatus, name="record_status"), nullable=False, default=RecordStatus.pending
    )
    readiness: Mapped[ProfileReadiness] = mapped_column(
        Enum(ProfileReadiness, name="profile_readiness"),
        nullable=False,
        default=ProfileReadiness.uploaded,
    )
    source_comparison_resolved: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_default: Mapped[bool] = mapped_column(nullable=False, default=False)
    ai_preferences: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False, default=dict)
    contact: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    application_defaults: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    socials: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False, default=dict)
    custom_sections: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)


class Operation(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "operations"

    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    operation_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[OperationStatus] = mapped_column(
        Enum(OperationStatus, name="operation_status"), nullable=False
    )
    stage: Mapped[OperationStage | None] = mapped_column(
        Enum(OperationStage, name="operation_stage")
    )
    progress: Mapped[int] = mapped_column(nullable=False, default=0)
    error_code: Mapped[str | None] = mapped_column(String(100))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SourceDocument(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "source_documents"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str] = mapped_column(String(120), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        Enum(RecordStatus, name="record_status", create_type=False), nullable=False
    )


class ParseRun(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "parse_runs"

    source_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False
    )
    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False
    )
    parser: Mapped[str] = mapped_column(String(80), nullable=False)
    parser_version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[OperationStatus] = mapped_column(
        Enum(OperationStatus, name="operation_status", create_type=False), nullable=False
    )
    parser_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class ProfileFact(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "profile_facts"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    parse_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("parse_runs.id", ondelete="CASCADE"), nullable=False
    )
    source_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    supersedes_fact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profile_facts.id", ondelete="SET NULL")
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    fact_key: Mapped[str] = mapped_column(String(160), nullable=False)
    fact_value: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    provenance: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    page_number: Mapped[int | None] = mapped_column()
    bounding_box: Mapped[list[float]] = mapped_column(JSONB, nullable=False, default=list)
    element_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    correction_version: Mapped[int] = mapped_column(nullable=False, default=0)
    is_current: Mapped[bool] = mapped_column(nullable=False, default=True)


class Job(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(240), nullable=False)
    company: Mapped[str | None] = mapped_column(String(240))
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        Enum(RecordStatus, name="record_status", create_type=False), nullable=False
    )
    job_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class JobRequirement(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "job_requirements"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    requirement_text: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    required: Mapped[bool] = mapped_column(nullable=False, default=False)
    requirement_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class MatchResult(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "match_results"

    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    operation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    status: Mapped[RecordStatus] = mapped_column(Enum(RecordStatus, name="record_status", create_type=False), nullable=False)
    explanation: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class GeneratedDocument(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "generated_documents"

    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    operation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[RecordStatus] = mapped_column(Enum(RecordStatus, name="record_status", create_type=False), nullable=False)
    html_storage_key: Mapped[str | None] = mapped_column(String(500))
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500))
    document_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class DocumentChange(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "document_changes"

    generated_document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("generated_documents.id", ondelete="CASCADE"), nullable=False)
    section: Mapped[str] = mapped_column(String(120), nullable=False)
    operation: Mapped[str] = mapped_column(String(20), nullable=False, default="rewrite")
    classification: Mapped[str] = mapped_column(String(20), nullable=False, default="REPHRASED")
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus, name="review_status"), nullable=False)
    evidence_fact_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)


class Application(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "applications"

    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    generated_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("generated_documents.id", ondelete="SET NULL"))
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="application_status"), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    application_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class ApplicationEvent(IdentifierMixin, Base):
    __tablename__ = "application_events"

    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class FillPlan(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "fill_plans"

    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    operation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[RecordStatus] = mapped_column(Enum(RecordStatus, name="record_status", create_type=False), nullable=False)
    fields: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)


class AgentRun(IdentifierMixin, Base):
    __tablename__ = "agent_runs"

    operation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    model: Mapped[str] = mapped_column(String(160), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), nullable=False)
    input_schema_version: Mapped[str] = mapped_column(String(40), nullable=False)
    output_schema_version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[OperationStatus] = mapped_column(Enum(OperationStatus, name="operation_status", create_type=False), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(100))
    agent_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class JobPosting(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "job_postings"
    __table_args__ = (
        UniqueConstraint("vendor", "vendor_job_id", name="uq_job_postings_vendor_job_id"),
    )

    vendor: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    vendor_job_id: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    team: Mapped[str | None] = mapped_column(String(300))
    location: Mapped[str | None] = mapped_column(String(1000))
    commitment: Mapped[str | None] = mapped_column(String(150))
    hosted_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    apply_url: Mapped[str | None] = mapped_column(String(2000))
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    description_text: Mapped[str | None] = mapped_column(Text)
    description_html: Mapped[str | None] = mapped_column(Text)
    source_language: Mapped[str | None] = mapped_column(String(40))
    source_department: Mapped[str | None] = mapped_column(String(300))
    workplace_type: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)
    employment_type: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)
    role_category: Mapped[str] = mapped_column(String(50), nullable=False, default="other", index=True)
    experience_level: Mapped[str] = mapped_column(String(40), nullable=False, default="unknown", index=True)
    source_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    max_experience: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)
    experience_min: Mapped[int | None] = mapped_column()
    experience_max: Mapped[int | None] = mapped_column()
    degree_level: Mapped[str] = mapped_column(String(40), nullable=False, default="none_mentioned", index=True)
    sponsorship: Mapped[str] = mapped_column(String(40), nullable=False, default="unknown", index=True)
    salary_min: Mapped[int | None] = mapped_column()
    salary_max: Mapped[int | None] = mapped_column()
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    salary_period: Mapped[str | None] = mapped_column(String(20))
    skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    languages: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    industry: Mapped[str] = mapped_column(String(80), nullable=False, default="unknown", index=True)
    travel: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)
    enrichment_evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    enrichment_version: Mapped[str | None] = mapped_column(String(40))


class CandidateJobState(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "candidate_job_states"
    __table_args__ = (
        UniqueConstraint("profile_id", "job_posting_id", name="uq_candidate_job_state_profile_job"),
    )

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_posting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    saved: Mapped[bool] = mapped_column(nullable=False, default=False)
    dismissed: Mapped[bool] = mapped_column(nullable=False, default=False)
    match_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    match_level: Mapped[str | None] = mapped_column(String(30))
    missing_critical_skills: Mapped[int | None] = mapped_column()
    scoring_version: Mapped[str | None] = mapped_column(String(40))
    job_fingerprint: Mapped[str | None] = mapped_column(String(64))
    profile_revision: Mapped[str | None] = mapped_column(String(64))


class TrackedApplication(IdentifierMixin, TimestampMixin, Base):
    """Applications the user has submitted (via quick-apply, manual apply, or a tailored submission).

    Denormalizes role/company so the Applications view and Overview stats render
    without joining across the separate ``jobs`` / ``job_postings`` catalogs.
    """

    __tablename__ = "tracked_applications"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_posting_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_postings.id", ondelete="SET NULL")
    )
    role: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[str] = mapped_column(String(300), nullable=False)
    location: Mapped[str | None] = mapped_column(String(1000))
    match_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    status: Mapped[ApplicationOutcome] = mapped_column(
        Enum(ApplicationOutcome, name="application_outcome"),
        nullable=False,
        default=ApplicationOutcome.applied,
    )
    source: Mapped[str] = mapped_column(String(40), nullable=False, default="quick_apply")
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    application_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class AutoApplyPipeline(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "auto_apply_pipelines"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[AutoApplyPipelineStatus] = mapped_column(
        Enum(AutoApplyPipelineStatus, name="auto_apply_pipeline_status"),
        nullable=False,
        default=AutoApplyPipelineStatus.queued,
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    execution_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="review")


class AutoApplyQueueItem(IdentifierMixin, TimestampMixin, Base):
    """A job queued for automated tailoring + submission, pending the user's review."""

    __tablename__ = "auto_apply_queue"
    __table_args__ = (
        UniqueConstraint("pipeline_id", "job_posting_id", name="uq_auto_apply_pipeline_job"),
    )

    pipeline_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auto_apply_pipelines.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(String(1000))

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_posting_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_postings.id", ondelete="SET NULL")
    )
    role: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[str] = mapped_column(String(300), nullable=False)
    location: Mapped[str | None] = mapped_column(String(1000))
    match_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    status: Mapped[AutoApplyStatus] = mapped_column(
        Enum(AutoApplyStatus, name="auto_apply_status"),
        nullable=False,
        default=AutoApplyStatus.queued,
    )
    note: Mapped[str | None] = mapped_column(String(300))
    queue_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
