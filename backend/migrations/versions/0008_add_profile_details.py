"""add_profile_details

Adds contact, application_defaults, socials and custom_sections JSONB columns to
profiles so this structured data persists server-side (was browser localStorage).

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-24 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0008'
down_revision: Union[str, Sequence[str], None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('contact', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column('profiles', sa.Column('application_defaults', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column('profiles', sa.Column('socials', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column('profiles', sa.Column('custom_sections', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))


def downgrade() -> None:
    op.drop_column('profiles', 'custom_sections')
    op.drop_column('profiles', 'socials')
    op.drop_column('profiles', 'application_defaults')
    op.drop_column('profiles', 'contact')
