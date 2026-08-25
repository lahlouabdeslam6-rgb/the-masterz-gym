"""Add promotional offers.

Revision ID: a1b2c3d4e5f6
Revises: d8e9f0a1b2c3
Create Date: 2026-08-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "d8e9f0a1b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "promotions",
        sa.Column("title", sa.String(length=140), nullable=False),
        sa.Column("slug", sa.String(length=170), nullable=False),
        sa.Column("short_description", sa.String(length=280), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("base_plan_id", sa.UUID(), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="MAD", nullable=False),
        sa.Column("participant_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
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
        sa.CheckConstraint("price > 0", name="ck_promotions_price_positive"),
        sa.CheckConstraint(
            "participant_count > 0", name="ck_promotions_participant_count_positive"
        ),
        sa.CheckConstraint("starts_at < ends_at", name="ck_promotions_date_range"),
        sa.ForeignKeyConstraint(["base_plan_id"], ["membership_plans.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    for column in ("slug", "base_plan_id", "is_active", "is_featured"):
        op.create_index(op.f(f"ix_promotions_{column}"), "promotions", [column], unique=False)

    op.add_column("membership_applications", sa.Column("promotion_id", sa.UUID(), nullable=True))
    op.add_column(
        "membership_applications",
        sa.Column("promotion_title", sa.String(length=140), nullable=True),
    )
    op.add_column(
        "membership_applications",
        sa.Column("promotion_price", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.add_column(
        "membership_applications",
        sa.Column("promotion_currency", sa.String(length=3), nullable=True),
    )
    op.add_column(
        "membership_applications",
        sa.Column("promotion_participant_count", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_membership_applications_promotion_id",
        "membership_applications",
        "promotions",
        ["promotion_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_membership_applications_promotion_participants_positive",
        "membership_applications",
        "promotion_participant_count IS NULL OR promotion_participant_count > 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_membership_applications_promotion_participants_positive",
        "membership_applications",
        type_="check",
    )
    op.drop_constraint(
        "fk_membership_applications_promotion_id",
        "membership_applications",
        type_="foreignkey",
    )
    for column in (
        "promotion_participant_count",
        "promotion_currency",
        "promotion_price",
        "promotion_title",
        "promotion_id",
    ):
        op.drop_column("membership_applications", column)
    for column in ("is_featured", "is_active", "base_plan_id", "slug"):
        op.drop_index(op.f(f"ix_promotions_{column}"), table_name="promotions")
    op.drop_table("promotions")
