"""add usage_events table for metering / cost attribution

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa


revision = 'b7c8d9e0f1a2'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'usage_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=50), nullable=False),
        sa.Column('key_hash', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=20), nullable=False),
        sa.Column('request_id', sa.String(length=50), nullable=True),
        sa.Column('feature', sa.String(length=100), nullable=True),
        sa.Column('customer_id', sa.String(length=100), nullable=True),
        sa.Column('workflow', sa.String(length=100), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=False),
        sa.Column('output_tokens', sa.Integer(), nullable=False),
        sa.Column('tokens_saved', sa.Integer(), nullable=False),
        sa.Column('cost_estimated', sa.Boolean(), nullable=False),
        sa.Column('cost_microdollars', sa.Integer(), nullable=True),
        sa.Column('cost_saved_microdollars', sa.Integer(), nullable=True),
        sa.Column('pricing_version', sa.String(length=20), nullable=True),
        sa.Column('idempotency_key', sa.String(length=64), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('bucket_date', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_usage_events_event_id'), 'usage_events', ['event_id'], unique=True)
    op.create_index(op.f('ix_usage_events_key_hash'), 'usage_events', ['key_hash'], unique=False)
    op.create_index('ix_usage_events_key_created', 'usage_events', ['key_hash', 'created_at'], unique=False)
    op.create_index('ix_usage_events_key_bucket', 'usage_events', ['key_hash', 'bucket_date'], unique=False)
    op.create_index('ix_usage_events_key_feature', 'usage_events', ['key_hash', 'feature'], unique=False)
    op.create_index('ix_usage_events_key_customer', 'usage_events', ['key_hash', 'customer_id'], unique=False)
    op.create_index('uq_usage_events_key_idem', 'usage_events', ['key_hash', 'idempotency_key'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_usage_events_key_idem', table_name='usage_events')
    op.drop_index('ix_usage_events_key_customer', table_name='usage_events')
    op.drop_index('ix_usage_events_key_feature', table_name='usage_events')
    op.drop_index('ix_usage_events_key_bucket', table_name='usage_events')
    op.drop_index('ix_usage_events_key_created', table_name='usage_events')
    op.drop_index(op.f('ix_usage_events_key_hash'), table_name='usage_events')
    op.drop_index(op.f('ix_usage_events_event_id'), table_name='usage_events')
    op.drop_table('usage_events')
