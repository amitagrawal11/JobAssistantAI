"""add auto apply pipelines

Revision ID: 0015
Revises: 0014
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, Sequence[str], None] = "0014"
branch_labels = None
depends_on = None

pipeline_status = postgresql.ENUM(
    "queued", "running", "paused", "completed", "completed_with_errors", "cancelled",
    name="auto_apply_pipeline_status", create_type=False,
)


def upgrade() -> None:
    pipeline_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "auto_apply_pipelines",
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("status", pipeline_status, nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auto_apply_pipelines_profile_id", "auto_apply_pipelines", ["profile_id"])
    op.drop_constraint("uq_auto_apply_profile_job", "auto_apply_queue", type_="unique")
    op.add_column("auto_apply_queue", sa.Column("pipeline_id", sa.UUID(), nullable=True))
    op.add_column("auto_apply_queue", sa.Column("position", sa.Integer(), server_default="0", nullable=False))
    op.add_column("auto_apply_queue", sa.Column("error", sa.String(length=1000), nullable=True))
    op.create_foreign_key(
        "fk_auto_apply_queue_pipeline", "auto_apply_queue", "auto_apply_pipelines",
        ["pipeline_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_auto_apply_queue_pipeline_id", "auto_apply_queue", ["pipeline_id"])
    op.create_unique_constraint(
        "uq_auto_apply_pipeline_job", "auto_apply_queue", ["pipeline_id", "job_posting_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_auto_apply_pipeline_job", "auto_apply_queue", type_="unique")
    op.drop_index("ix_auto_apply_queue_pipeline_id", table_name="auto_apply_queue")
    op.drop_constraint("fk_auto_apply_queue_pipeline", "auto_apply_queue", type_="foreignkey")
    op.drop_column("auto_apply_queue", "error")
    op.drop_column("auto_apply_queue", "position")
    op.drop_column("auto_apply_queue", "pipeline_id")
    op.create_unique_constraint(
        "uq_auto_apply_profile_job", "auto_apply_queue", ["profile_id", "job_posting_id"]
    )
    op.drop_index("ix_auto_apply_pipelines_profile_id", table_name="auto_apply_pipelines")
    op.drop_table("auto_apply_pipelines")
    pipeline_status.drop(op.get_bind(), checkfirst=True)
