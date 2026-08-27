"""Add coaching sub-slots and private coaching messages.

Revision ID: d7e8f9a0b1c2
Revises: c3d4e5f6a7b8
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d7e8f9a0b1c2"
down_revision: str | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "coach_availabilities",
        sa.Column(
            "session_duration_minutes",
            sa.Integer(),
            server_default="60",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_coach_availability_session_duration",
        "coach_availabilities",
        "session_duration_minutes BETWEEN 15 AND 240",
    )
    op.alter_column(
        "coach_availabilities",
        "session_duration_minutes",
        server_default=None,
    )
    op.drop_index(
        "uq_coaching_bookings_member_availability",
        table_name="coaching_bookings",
    )
    op.create_index(
        "uq_coaching_bookings_member_availability_start",
        "coaching_bookings",
        ["member_id", "availability_id", "starts_at"],
        unique=True,
    )
    op.create_table(
        "coaching_messages",
        sa.Column("assignment_id", sa.UUID(), nullable=False),
        sa.Column("sender_id", sa.UUID(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column("media_type", sa.String(length=20), nullable=True),
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
            "body IS NOT NULL OR media_url IS NOT NULL",
            name="ck_coaching_messages_content",
        ),
        sa.CheckConstraint(
            "media_type IS NULL OR media_type IN ('image', 'audio')",
            name="ck_coaching_messages_media_type",
        ),
        sa.ForeignKeyConstraint(["assignment_id"], ["coach_member_assignments.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coaching_messages_assignment_id"),
        "coaching_messages",
        ["assignment_id"],
    )
    op.create_index(
        op.f("ix_coaching_messages_sender_id"),
        "coaching_messages",
        ["sender_id"],
    )
    op.create_index(
        "ix_coaching_messages_assignment_created",
        "coaching_messages",
        ["assignment_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_coaching_messages_assignment_created",
        table_name="coaching_messages",
    )
    op.drop_index(
        op.f("ix_coaching_messages_sender_id"),
        table_name="coaching_messages",
    )
    op.drop_index(
        op.f("ix_coaching_messages_assignment_id"),
        table_name="coaching_messages",
    )
    op.drop_table("coaching_messages")
    op.drop_index(
        "uq_coaching_bookings_member_availability_start",
        table_name="coaching_bookings",
    )
    op.create_index(
        "uq_coaching_bookings_member_availability",
        "coaching_bookings",
        ["member_id", "availability_id"],
        unique=True,
    )
    op.drop_constraint(
        "ck_coach_availability_session_duration",
        "coach_availabilities",
        type_="check",
    )
    op.drop_column("coach_availabilities", "session_duration_minutes")
