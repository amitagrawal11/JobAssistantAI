"""add evidence backed job enrichment

Revision ID: 0012
Revises: 0011
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, Sequence[str], None] = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = (
        sa.Column("max_experience", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("experience_min", sa.Integer()),
        sa.Column("experience_max", sa.Integer()),
        sa.Column("degree_level", sa.String(40), nullable=False, server_default="none_mentioned"),
        sa.Column("sponsorship", sa.String(40), nullable=False, server_default="unknown"),
        sa.Column("salary_min", sa.Integer()), sa.Column("salary_max", sa.Integer()),
        sa.Column("salary_currency", sa.String(3)), sa.Column("salary_period", sa.String(20)),
        sa.Column("skills", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("languages", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("industry", sa.String(80), nullable=False, server_default="unknown"),
        sa.Column("travel", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("enrichment_evidence", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("enrichment_version", sa.String(40)),
    )
    for column in columns:
        op.add_column("job_postings", column)
    for name in ("max_experience", "degree_level", "sponsorship", "industry", "travel"):
        op.create_index(f"ix_job_postings_{name}", "job_postings", [name])


def downgrade() -> None:
    for name in ("travel", "industry", "sponsorship", "degree_level", "max_experience"):
        op.drop_index(f"ix_job_postings_{name}", table_name="job_postings")
    for name in ("enrichment_version", "enrichment_evidence", "travel", "industry", "languages",
                 "skills", "salary_period", "salary_currency", "salary_max", "salary_min",
                 "sponsorship", "degree_level", "experience_max", "experience_min", "max_experience"):
        op.drop_column("job_postings", name)
