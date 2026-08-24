"""Add the configurable Store low-stock threshold.

Revision ID: f3b4c5d6e7a8
Revises: e2a3b4c5d6f7
Create Date: 2026-08-24
"""

from collections.abc import Sequence

from alembic import op

revision: str = "f3b4c5d6e7a8"
down_revision: str | None = "e2a3b4c5d6f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO system_settings (id, key, value)
        VALUES (
            'f3b4c5d6-e7a8-4b9c-a0d1-e2f3a4b5c6d7'::uuid,
            'store_low_stock_threshold',
            '{"value": 5}'::jsonb
        )
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE key = 'store_low_stock_threshold'")
