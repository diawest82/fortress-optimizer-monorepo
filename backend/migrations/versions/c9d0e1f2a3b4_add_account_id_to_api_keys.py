"""add account_id to api_keys + one-active-free-key-per-account unique index

Backs the account-gated free-tier change: every key is tied to an OAuth
account_id, and at most one ACTIVE FREE key may exist per account. The unique
index is partial (only tier='free' AND is_active AND account_id IS NOT NULL),
so paid keys and legacy NULL-account keys are unaffected.

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9d0e1f2a3b4'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('api_keys', sa.Column('account_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_api_keys_account_id'), 'api_keys', ['account_id'], unique=False)
    # Partial unique index: one active free key per account. Supported by both
    # PostgreSQL and SQLite via the postgresql_where / sqlite_where dialect args.
    op.create_index(
        'uq_api_keys_free_account',
        'api_keys',
        ['account_id'],
        unique=True,
        postgresql_where=sa.text("tier = 'free' AND is_active = true AND account_id IS NOT NULL"),
        sqlite_where=sa.text("tier = 'free' AND is_active = 1 AND account_id IS NOT NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_api_keys_free_account', table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_account_id'), table_name='api_keys')
    op.drop_column('api_keys', 'account_id')
