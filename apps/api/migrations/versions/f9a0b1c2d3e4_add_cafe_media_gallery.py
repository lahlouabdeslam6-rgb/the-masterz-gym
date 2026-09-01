"""Add a media gallery to Healthy Cafe items.

Revision ID: f9a0b1c2d3e4
Revises: e8f1a2b3c4d5
Create Date: 2026-08-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f9a0b1c2d3e4"
down_revision: str | None = "e8f1a2b3c4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "cafe_menu_items",
        sa.Column(
            "media_urls",
            postgresql.ARRAY(sa.String(length=500)),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE cafe_menu_items
        SET media_urls = ARRAY[image_url]::varchar[]
        WHERE image_url IS NOT NULL AND image_url <> ''
        """
    )


def downgrade() -> None:
    op.drop_column("cafe_menu_items", "media_urls")
