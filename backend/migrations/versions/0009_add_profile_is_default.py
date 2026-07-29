"""add_profile_is_default

Adds an is_default boolean to profiles so a user can mark one profile as the
default. A partial unique index enforces at most one default profile.

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0009'
down_revision: Union[str, Sequence[str], None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'profiles',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    # At most one default profile at a time.
    op.create_index(
        'uq_profiles_single_default',
        'profiles',
        ['is_default'],
        unique=True,
        postgresql_where=sa.text('is_default'),
    )
    # Seed a default: the most recently updated profile becomes the default.
    op.execute(
        """
        UPDATE profiles SET is_default = true
        WHERE id = (
            SELECT id FROM profiles
            WHERE status <> 'archived'
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
        )
        """
    )


def downgrade() -> None:
    op.drop_index('uq_profiles_single_default', table_name='profiles')
    op.drop_column('profiles', 'is_default')
