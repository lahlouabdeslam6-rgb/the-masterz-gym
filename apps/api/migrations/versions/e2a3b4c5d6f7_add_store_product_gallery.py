"""Add a media gallery to Store products.

Revision ID: e2a3b4c5d6f7
Revises: d1f2a3b4c5e6
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e2a3b4c5d6f7"
down_revision: str | None = "d1f2a3b4c5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "store_products",
        sa.Column(
            "media_urls",
            postgresql.ARRAY(sa.String(length=500)),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE store_products
        SET media_urls = ARRAY[image_url]::varchar[]
        WHERE image_url IS NOT NULL AND image_url <> ''
        """
    )


def downgrade() -> None:
    op.drop_column("store_products", "media_urls")
