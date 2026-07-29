"""add auto apply execution mode

Revision ID: 0016
Revises: 0015
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: Union[str, Sequence[str], None] = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "auto_apply_pipelines",
        sa.Column("execution_mode", sa.String(length=20), server_default="review", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("auto_apply_pipelines", "execution_mode")
