"""add operation stage and heartbeat

Revision ID: 0014
Revises: 0013
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0014"
down_revision: Union[str, Sequence[str], None] = "0013"
branch_labels = None
depends_on = None


operation_stage = sa.Enum(
    "uploading",
    "reading",
    "extracting",
    "complete",
    "failed",
    name="operation_stage",
)


def upgrade() -> None:
    operation_stage.create(op.get_bind(), checkfirst=True)
    op.add_column("operations", sa.Column("stage", operation_stage, nullable=True))
    op.add_column(
        "operations",
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE operations
        SET stage = CASE
          WHEN status = 'succeeded' THEN 'complete'::operation_stage
          WHEN status = 'failed' THEN 'failed'::operation_stage
          ELSE stage
        END
        WHERE operation_type = 'parse_document'
        """
    )
    op.create_index(
        "uq_one_active_profile_extraction",
        "operations",
        ["operation_type"],
        unique=True,
        postgresql_where=sa.text(
            "operation_type = 'parse_document' "
            "AND status IN ('pending', 'running')"
        ),
    )


def downgrade() -> None:
    op.drop_index("uq_one_active_profile_extraction", table_name="operations")
    op.drop_column("operations", "heartbeat_at")
    op.drop_column("operations", "stage")
    operation_stage.drop(op.get_bind(), checkfirst=True)
