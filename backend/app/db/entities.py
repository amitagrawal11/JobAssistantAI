from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdentifierMixin, TimestampMixin


class RecordStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"
    archived = "archived"


class OperationStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
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


class Profile(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    status: Mapped[RecordStatus] = mapped_column(
        Enum(RecordStatus, name="record_status"), nullable=False, default=RecordStatus.pending
    )


class Operation(IdentifierMixin, TimestampMixin, Base):
    __tablename__ = "operations"

    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    operation_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[OperationStatus] = mapped_column(
        Enum(OperationStatus, name="operation_status"), nullable=False
    )
    progress: Mapped[int] = mapped_column(nullable=False, default=0)
    error_code: Mapped[str | None] = mapped_column(String(100))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


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
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    fact_key: Mapped[str] = mapped_column(String(160), nullable=False)
    fact_value: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    provenance: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


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
