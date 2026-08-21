"""Add Store products, reservations and direct sales.

Revision ID: d1f2a3b4c5e6
Revises: c0e1f2a3b4d5
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d1f2a3b4c5e6"
down_revision: str | None = "c0e1f2a3b4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "store_products",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default="true", nullable=False
        ),
        sa.Column("id", sa.UUID(), nullable=False),
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
        sa.CheckConstraint(
            "stock_quantity >= 0", name="ck_store_products_nonnegative_stock"
        ),
        sa.CheckConstraint(
            "price > 0", name="ck_store_products_positive_price"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_store_products_is_active"),
        "store_products",
        ["is_active"],
        unique=False,
    )
    op.create_index(
        op.f("ix_store_products_name"), "store_products", ["name"], unique=False
    )

    op.create_table(
        "store_reservations",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("processed_by_id", sa.UUID(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
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
        sa.CheckConstraint(
            "quantity > 0", name="ck_store_reservations_positive_quantity"
        ),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.ForeignKeyConstraint(
            ["processed_by_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["product_id"], ["store_products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("member_id", "processed_by_id", "product_id", "status"):
        op.create_index(
            op.f(f"ix_store_reservations_{column}"),
            "store_reservations",
            [column],
            unique=False,
        )

    op.create_table(
        "store_sales",
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("reservation_id", sa.UUID(), nullable=True),
        sa.Column("member_id", sa.UUID(), nullable=True),
        sa.Column("buyer_name", sa.String(length=160), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("payment_method", sa.String(length=32), nullable=False),
        sa.Column("recorded_by_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.CheckConstraint(
            "quantity > 0", name="ck_store_sales_positive_quantity"
        ),
        sa.CheckConstraint(
            "total_amount > 0", name="ck_store_sales_positive_total"
        ),
        sa.ForeignKeyConstraint(
            ["member_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["product_id"], ["store_products.id"]),
        sa.ForeignKeyConstraint(
            ["reservation_id"], ["store_reservations.id"]
        ),
        sa.ForeignKeyConstraint(["recorded_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
        sa.UniqueConstraint("reservation_id"),
    )
    for column in (
        "created_at",
        "idempotency_key",
        "member_id",
        "product_id",
        "recorded_by_id",
        "reservation_id",
    ):
        op.create_index(
            op.f(f"ix_store_sales_{column}"),
            "store_sales",
            [column],
            unique=column in {"idempotency_key", "reservation_id"},
        )


def downgrade() -> None:
    for column in (
        "recorded_by_id",
        "reservation_id",
        "product_id",
        "member_id",
        "idempotency_key",
        "created_at",
    ):
        op.drop_index(
            op.f(f"ix_store_sales_{column}"), table_name="store_sales"
        )
    op.drop_table("store_sales")
    for column in ("status", "product_id", "processed_by_id", "member_id"):
        op.drop_index(
            op.f(f"ix_store_reservations_{column}"),
            table_name="store_reservations",
        )
    op.drop_table("store_reservations")
    op.drop_index(op.f("ix_store_products_name"), table_name="store_products")
    op.drop_index(
        op.f("ix_store_products_is_active"), table_name="store_products"
    )
    op.drop_table("store_products")
