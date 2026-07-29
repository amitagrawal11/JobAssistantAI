"""add_application_tracking

Adds tracked_applications and auto_apply_queue tables (plus their enums) to
power the Applications, Auto-Apply Queue, and Overview pages.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-24 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0007'
down_revision: Union[str, Sequence[str], None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


application_outcome = postgresql.ENUM(
    'applied', 'interview', 'offer', 'rejected',
    name='application_outcome', create_type=False,
)
auto_apply_status = postgresql.ENUM(
    'queued', 'awaiting_approval', 'tailoring', 'submitted', 'skipped',
    name='auto_apply_status', create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    application_outcome.create(bind, checkfirst=True)
    auto_apply_status.create(bind, checkfirst=True)

    op.create_table(
        'tracked_applications',
        sa.Column('profile_id', sa.UUID(), nullable=False),
        sa.Column('job_posting_id', sa.UUID(), nullable=True),
        sa.Column('role', sa.String(length=500), nullable=False),
        sa.Column('company', sa.String(length=300), nullable=False),
        sa.Column('location', sa.String(length=1000), nullable=True),
        sa.Column('match_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('status', application_outcome, nullable=False),
        sa.Column('source', sa.String(length=40), nullable=False),
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('application_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tracked_applications_profile_id', 'tracked_applications', ['profile_id'])

    op.create_table(
        'auto_apply_queue',
        sa.Column('profile_id', sa.UUID(), nullable=False),
        sa.Column('job_posting_id', sa.UUID(), nullable=True),
        sa.Column('role', sa.String(length=500), nullable=False),
        sa.Column('company', sa.String(length=300), nullable=False),
        sa.Column('location', sa.String(length=1000), nullable=True),
        sa.Column('match_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('status', auto_apply_status, nullable=False),
        sa.Column('note', sa.String(length=300), nullable=True),
        sa.Column('queue_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('profile_id', 'job_posting_id', name='uq_auto_apply_profile_job'),
    )
    op.create_index('ix_auto_apply_queue_profile_id', 'auto_apply_queue', ['profile_id'])


def downgrade() -> None:
    op.drop_index('ix_auto_apply_queue_profile_id', table_name='auto_apply_queue')
    op.drop_table('auto_apply_queue')
    op.drop_index('ix_tracked_applications_profile_id', table_name='tracked_applications')
    op.drop_table('tracked_applications')

    bind = op.get_bind()
    auto_apply_status.drop(bind, checkfirst=True)
    application_outcome.drop(bind, checkfirst=True)
