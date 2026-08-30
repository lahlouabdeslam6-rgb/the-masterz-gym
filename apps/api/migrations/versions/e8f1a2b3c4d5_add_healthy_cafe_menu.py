"""Add the admin-managed Healthy Cafe menu.

Revision ID: e8f1a2b3c4d5
Revises: d7e8f9a0b1c2
Create Date: 2026-08-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e8f1a2b3c4d5"
down_revision: str | None = "d7e8f9a0b1c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cafe_menu_items",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.CheckConstraint("display_order >= 0", name="ck_cafe_menu_items_display_order"),
        sa.CheckConstraint("price > 0", name="ck_cafe_menu_items_positive_price"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cafe_menu_items_category"), "cafe_menu_items", ["category"])
    op.create_index(op.f("ix_cafe_menu_items_is_active"), "cafe_menu_items", ["is_active"])
    op.create_index(op.f("ix_cafe_menu_items_name"), "cafe_menu_items", ["name"])


def downgrade() -> None:
    op.drop_index(op.f("ix_cafe_menu_items_name"), table_name="cafe_menu_items")
    op.drop_index(op.f("ix_cafe_menu_items_is_active"), table_name="cafe_menu_items")
    op.drop_index(op.f("ix_cafe_menu_items_category"), table_name="cafe_menu_items")
    op.drop_table("cafe_menu_items")
