"""Add service types to plans and subscriptions.

Revision ID: d4e8a1b3c5f7
Revises: c2a9f4e6b8d1
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e8a1b3c5f7"
down_revision: str | None = "c2a9f4e6b8d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    service_type = sa.Enum("GYM", "COACHING", "RECOVERY", name="service_type")
    service_type.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "membership_plans",
        sa.Column(
            "service_type",
            service_type,
            server_default="GYM",
            nullable=False,
        ),
    )
    op.add_column(
        "subscriptions",
        sa.Column(
            "service_type",
            service_type,
            server_default="GYM",
            nullable=False,
        ),
    )
    op.alter_column("membership_plans", "service_type", server_default=None)
    op.alter_column("subscriptions", "service_type", server_default=None)
    op.create_index(
        op.f("ix_membership_plans_service_type"),
        "membership_plans",
        ["service_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_subscriptions_service_type"),
        "subscriptions",
        ["service_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_subscriptions_service_type"), table_name="subscriptions"
    )
    op.drop_index(
        op.f("ix_membership_plans_service_type"), table_name="membership_plans"
    )
    op.drop_column("subscriptions", "service_type")
    op.drop_column("membership_plans", "service_type")
    sa.Enum(name="service_type").drop(op.get_bind(), checkfirst=True)
