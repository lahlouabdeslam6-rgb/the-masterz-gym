"""Add coach availability and coaching bookings.

Revision ID: a4b5c6d7e8f9
Revises: f3b4c5d6e7a8
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a4b5c6d7e8f9"
down_revision: str | None = "f3b4c5d6e7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    booking_status = postgresql.ENUM(
        "REQUESTED",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
        name="coaching_booking_status",
        create_type=False,
    )
    postgresql.ENUM(
        "REQUESTED",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
        name="coaching_booking_status",
    ).create(op.get_bind(), checkfirst=True)

    op.create_table(
        "coach_availabilities",
        sa.Column("coach_id", sa.UUID(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
            "ends_at > starts_at",
            name="ck_coach_availability_valid_period",
        ),
        sa.ForeignKeyConstraint(["coach_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coach_availabilities_coach_id"),
        "coach_availabilities",
        ["coach_id"],
        unique=False,
    )
    op.create_index(
        "ix_coach_availability_coach_starts_at",
        "coach_availabilities",
        ["coach_id", "starts_at"],
        unique=False,
    )

    op.create_table(
        "coaching_bookings",
        sa.Column("availability_id", sa.UUID(), nullable=False),
        sa.Column("assignment_id", sa.UUID(), nullable=False),
        sa.Column("coach_id", sa.UUID(), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            booking_status,
            server_default="REQUESTED",
            nullable=False,
        ),
        sa.Column("member_note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("decided_by_id", sa.UUID(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "conflict_override",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
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
        sa.CheckConstraint("ends_at > starts_at", name="ck_coaching_booking_valid_period"),
        sa.ForeignKeyConstraint(["assignment_id"], ["coach_member_assignments.id"]),
        sa.ForeignKeyConstraint(["availability_id"], ["coach_availabilities.id"]),
        sa.ForeignKeyConstraint(["coach_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["decided_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("assignment_id", "availability_id", "coach_id", "member_id", "status"):
        op.create_index(
            op.f(f"ix_coaching_bookings_{column}"),
            "coaching_bookings",
            [column],
            unique=False,
        )
    op.create_index(
        "ix_coaching_bookings_coach_starts_at",
        "coaching_bookings",
        ["coach_id", "starts_at"],
        unique=False,
    )
    op.create_index(
        "ix_coaching_bookings_member_starts_at",
        "coaching_bookings",
        ["member_id", "starts_at"],
        unique=False,
    )
    op.create_index(
        "uq_coaching_bookings_member_availability",
        "coaching_bookings",
        ["member_id", "availability_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_coaching_bookings_member_availability",
        table_name="coaching_bookings",
    )
    op.drop_index(
        "ix_coaching_bookings_member_starts_at",
        table_name="coaching_bookings",
    )
    op.drop_index(
        "ix_coaching_bookings_coach_starts_at",
        table_name="coaching_bookings",
    )
    for column in ("status", "member_id", "coach_id", "availability_id", "assignment_id"):
        op.drop_index(op.f(f"ix_coaching_bookings_{column}"), table_name="coaching_bookings")
    op.drop_table("coaching_bookings")
    op.drop_index(
        "ix_coach_availability_coach_starts_at",
        table_name="coach_availabilities",
    )
    op.drop_index(
        op.f("ix_coach_availabilities_coach_id"),
        table_name="coach_availabilities",
    )
    op.drop_table("coach_availabilities")
    sa.Enum(name="coaching_booking_status").drop(op.get_bind(), checkfirst=True)
