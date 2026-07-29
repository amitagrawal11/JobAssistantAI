"""add structured job filter fields

Revision ID: 0011
Revises: 0010
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, Sequence[str], None] = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name, column in (
        ("description_text", sa.Column("description_text", sa.Text())),
        ("description_html", sa.Column("description_html", sa.Text())),
        ("source_language", sa.Column("source_language", sa.String(40))),
        ("source_department", sa.Column("source_department", sa.String(300))),
        ("workplace_type", sa.Column("workplace_type", sa.String(30), nullable=False, server_default="unknown")),
        ("employment_type", sa.Column("employment_type", sa.String(30), nullable=False, server_default="unknown")),
        ("role_category", sa.Column("role_category", sa.String(50), nullable=False, server_default="other")),
        ("experience_level", sa.Column("experience_level", sa.String(40), nullable=False, server_default="unknown")),
        ("source_fingerprint", sa.Column("source_fingerprint", sa.String(64), nullable=False, server_default="")),
    ):
        op.add_column("job_postings", column)
    for name in ("workplace_type", "employment_type", "role_category", "experience_level", "posted_at"):
        op.create_index(f"ix_job_postings_{name}", "job_postings", [name])


def downgrade() -> None:
    for name in ("posted_at", "experience_level", "role_category", "employment_type", "workplace_type"):
        op.drop_index(f"ix_job_postings_{name}", table_name="job_postings")
    for name in ("source_fingerprint", "experience_level", "role_category", "employment_type",
                 "workplace_type", "source_department", "source_language", "description_html", "description_text"):
        op.drop_column("job_postings", name)
