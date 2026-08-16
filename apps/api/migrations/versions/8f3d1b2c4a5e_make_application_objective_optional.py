"""Make membership application objective optional.

Revision ID: 8f3d1b2c4a5e
Revises: 714b8fb996a5
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8f3d1b2c4a5e"
down_revision: str | None = "714b8fb996a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "membership_applications",
        "fitness_objective",
        existing_type=sa.String(length=500),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        "UPDATE membership_applications "
        "SET fitness_objective = 'Non renseigné' "
        "WHERE fitness_objective IS NULL"
    )
    op.alter_column(
        "membership_applications",
        "fitness_objective",
        existing_type=sa.String(length=500),
        nullable=False,
    )
