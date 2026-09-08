"""Add martial arts as a session-based subscription category.

Revision ID: 2c3d4e5f6a7b
Revises: 1b2c3d4e5f6a
Create Date: 2026-09-02
"""

from collections.abc import Sequence

from alembic import op

revision: str = "2c3d4e5f6a7b"
down_revision: str | None = "1b2c3d4e5f6a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'MARTIAL_ARTS'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely while referenced.
    pass
