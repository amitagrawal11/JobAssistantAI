"""add candidate job state

Revision ID: 0013
Revises: 0012
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, Sequence[str], None] = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "candidate_job_states",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("job_posting_id", sa.UUID(), nullable=False),
        sa.Column("saved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("dismissed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("match_score", sa.Numeric(5, 2)),
        sa.Column("match_level", sa.String(30)),
        sa.Column("missing_critical_skills", sa.Integer()),
        sa.Column("scoring_version", sa.String(40)),
        sa.Column("job_fingerprint", sa.String(64)),
        sa.Column("profile_revision", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("profile_id", "job_posting_id", name="uq_candidate_job_state_profile_job"),
    )
    op.create_index("ix_candidate_job_states_profile_id", "candidate_job_states", ["profile_id"])
    op.create_index("ix_candidate_job_states_job_posting_id", "candidate_job_states", ["job_posting_id"])


def downgrade() -> None:
    op.drop_index("ix_candidate_job_states_job_posting_id", table_name="candidate_job_states")
    op.drop_index("ix_candidate_job_states_profile_id", table_name="candidate_job_states")
    op.drop_table("candidate_job_states")
