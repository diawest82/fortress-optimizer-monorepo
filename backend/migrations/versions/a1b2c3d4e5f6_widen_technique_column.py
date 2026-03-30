"""Widen technique column from 100 to 255 chars

Aggressive optimization produces technique strings > 100 chars,
causing StringDataRightTruncation on INSERT.

Revision ID: a1b2c3d4e5f6
Revises: edd3ef9e3f62
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'edd3ef9e3f62'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'optimization_logs',
        'technique',
        existing_type=sa.String(100),
        type_=sa.String(255),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'optimization_logs',
        'technique',
        existing_type=sa.String(255),
        type_=sa.String(100),
        existing_nullable=False,
    )
