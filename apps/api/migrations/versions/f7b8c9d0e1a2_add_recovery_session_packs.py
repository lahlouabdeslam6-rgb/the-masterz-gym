"""Add recovery session packs and visit history.

Revision ID: f7b8c9d0e1a2
Revises: e6a7c8d9f0b1
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f7b8c9d0e1a2"
down_revision: str | None = "e6a7c8d9f0b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("membership_plans", sa.Column("session_count", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_membership_plans_session_count_positive",
        "membership_plans",
        "session_count IS NULL OR session_count > 0",
    )
    op.add_column("subscriptions", sa.Column("total_sessions", sa.Integer(), nullable=True))
    op.add_column("subscriptions", sa.Column("remaining_sessions", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_subscriptions_total_sessions_positive",
        "subscriptions",
        "total_sessions IS NULL OR total_sessions > 0",
    )
    op.create_check_constraint(
        "ck_subscriptions_remaining_sessions_non_negative",
        "subscriptions",
        "remaining_sessions IS NULL OR remaining_sessions >= 0",
    )
    op.create_check_constraint(
        "ck_subscriptions_remaining_sessions_within_total",
        "subscriptions",
        "remaining_sessions IS NULL OR total_sessions IS NULL "
        "OR remaining_sessions <= total_sessions",
    )

    op.create_table(
        "recovery_visits",
        sa.Column("idempotency_key", sa.String(length=100), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("subscription_id", sa.UUID(), nullable=False),
        sa.Column("recorded_by_id", sa.UUID(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("sauna_used", sa.Boolean(), nullable=False),
        sa.Column("cold_bath_used", sa.Boolean(), nullable=False),
        sa.Column("compression_used", sa.Boolean(), nullable=False),
        sa.Column("remaining_sessions_after", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "sauna_used OR cold_bath_used OR compression_used",
            name="ck_recovery_visits_service_selected",
        ),
        sa.CheckConstraint(
            "remaining_sessions_after >= 0",
            name="ck_recovery_visits_remaining_non_negative",
        ),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["recorded_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(
        op.f("ix_recovery_visits_idempotency_key"),
        "recovery_visits",
        ["idempotency_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_recovery_visits_member_id"),
        "recovery_visits",
        ["member_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recovery_visits_occurred_at"),
        "recovery_visits",
        ["occurred_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recovery_visits_subscription_id"),
        "recovery_visits",
        ["subscription_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recovery_visits_subscription_id"), table_name="recovery_visits")
    op.drop_index(op.f("ix_recovery_visits_occurred_at"), table_name="recovery_visits")
    op.drop_index(op.f("ix_recovery_visits_member_id"), table_name="recovery_visits")
    op.drop_index(op.f("ix_recovery_visits_idempotency_key"), table_name="recovery_visits")
    op.drop_table("recovery_visits")
    op.drop_constraint(
        "ck_subscriptions_remaining_sessions_within_total",
        "subscriptions",
        type_="check",
    )
    op.drop_constraint(
        "ck_subscriptions_remaining_sessions_non_negative",
        "subscriptions",
        type_="check",
    )
    op.drop_constraint(
        "ck_subscriptions_total_sessions_positive",
        "subscriptions",
        type_="check",
    )
    op.drop_column("subscriptions", "remaining_sessions")
    op.drop_column("subscriptions", "total_sessions")
    op.drop_constraint(
        "ck_membership_plans_session_count_positive",
        "membership_plans",
        type_="check",
    )
    op.drop_column("membership_plans", "session_count")
