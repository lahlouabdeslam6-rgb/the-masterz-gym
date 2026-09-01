"""Add Salle 2 collective class planning, reservations and waitlists.

Revision ID: 1b2c3d4e5f6a
Revises: 0a1b2c3d4e5f
Create Date: 2026-08-31
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "1b2c3d4e5f6a"
down_revision: str | None = "0a1b2c3d4e5f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SALLE_2_ID = "22222222-2222-4222-8222-222222222222"

SESSION_STATUS = postgresql.ENUM(
    "SCHEDULED",
    "CANCELLED",
    "COMPLETED",
    name="collective_class_session_status",
    create_type=False,
)
RESERVATION_STATUS = postgresql.ENUM(
    "CONFIRMED",
    "WAITLISTED",
    "CANCELLED",
    "ATTENDED",
    "NO_SHOW",
    name="collective_class_reservation_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(
        "SCHEDULED",
        "CANCELLED",
        "COMPLETED",
        name="collective_class_session_status",
    ).create(bind, checkfirst=True)
    postgresql.ENUM(
        "CONFIRMED",
        "WAITLISTED",
        "CANCELLED",
        "ATTENDED",
        "NO_SHOW",
        name="collective_class_reservation_status",
    ).create(bind, checkfirst=True)

    op.create_table(
        "collective_class_types",
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("default_capacity", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
            "default_duration_minutes > 0",
            name="ck_class_type_duration_positive",
        ),
        sa.CheckConstraint(
            "default_capacity > 0",
            name="ck_class_type_capacity_positive",
        ),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("club_id", "name", name="uq_collective_class_type_club_name"),
    )
    op.create_index(
        "ix_collective_class_types_club_id",
        "collective_class_types",
        ["club_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_types_is_active",
        "collective_class_types",
        ["is_active"],
        unique=False,
    )

    op.create_table(
        "collective_class_sessions",
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("class_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("coach_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", SESSION_STATUS, nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.CheckConstraint("ends_at > starts_at", name="ck_collective_session_dates"),
        sa.CheckConstraint("capacity > 0", name="ck_collective_session_capacity_positive"),
        sa.ForeignKeyConstraint(["class_type_id"], ["collective_class_types.id"]),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.ForeignKeyConstraint(["coach_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_collective_class_sessions_club_id",
        "collective_class_sessions",
        ["club_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_sessions_class_type_id",
        "collective_class_sessions",
        ["class_type_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_sessions_coach_id",
        "collective_class_sessions",
        ["coach_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_sessions_starts_at",
        "collective_class_sessions",
        ["starts_at"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_sessions_status",
        "collective_class_sessions",
        ["status"],
        unique=False,
    )

    op.create_table(
        "collective_class_reservations",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", RESERVATION_STATUS, nullable=False),
        sa.Column("waitlist_position", sa.Integer(), nullable=True),
        sa.Column("cancelled_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=500), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
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
            "status != 'WAITLISTED' OR waitlist_position IS NOT NULL",
            name="ck_collective_reservation_waitlist_position",
        ),
        sa.ForeignKeyConstraint(["cancelled_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["collective_class_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "member_id", name="uq_collective_reservation_member"),
    )
    op.create_index(
        "ix_collective_class_reservations_session_id",
        "collective_class_reservations",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_reservations_member_id",
        "collective_class_reservations",
        ["member_id"],
        unique=False,
    )
    op.create_index(
        "ix_collective_class_reservations_status",
        "collective_class_reservations",
        ["status"],
        unique=False,
    )

    # Initial Salle 2 catalogue. Capacity and duration remain editable by Admin.
    class_types = sa.table(
        "collective_class_types",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("club_id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("default_duration_minutes", sa.Integer()),
        sa.column("default_capacity", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )
    club_id = uuid.UUID(SALLE_2_ID)
    initial_types = (
        ("31000000-0000-4000-8000-000000000001", "Grit", 45),
        ("31000000-0000-4000-8000-000000000002", "Circuit Training", 60),
        ("31000000-0000-4000-8000-000000000003", "Masterz Pump", 60),
        ("31000000-0000-4000-8000-000000000004", "Masterz Cardio", 45),
        ("31000000-0000-4000-8000-000000000005", "Masterz Fit Boxing", 60),
        ("31000000-0000-4000-8000-000000000006", "CrossFit", 60),
        ("31000000-0000-4000-8000-000000000007", "Kick Boxing", 60),
        ("31000000-0000-4000-8000-000000000008", "Karate Olympique Senior", 60),
    )
    op.bulk_insert(
        class_types,
        [
            {
                "id": uuid.UUID(item_id),
                "club_id": club_id,
                "name": name,
                "description": None,
                "default_duration_minutes": duration,
                "default_capacity": 30,
                "is_active": True,
            }
            for item_id, name, duration in initial_types
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_collective_class_reservations_status",
        table_name="collective_class_reservations",
    )
    op.drop_index(
        "ix_collective_class_reservations_member_id",
        table_name="collective_class_reservations",
    )
    op.drop_index(
        "ix_collective_class_reservations_session_id",
        table_name="collective_class_reservations",
    )
    op.drop_table("collective_class_reservations")

    op.drop_index("ix_collective_class_sessions_status", table_name="collective_class_sessions")
    op.drop_index(
        "ix_collective_class_sessions_starts_at",
        table_name="collective_class_sessions",
    )
    op.drop_index(
        "ix_collective_class_sessions_coach_id",
        table_name="collective_class_sessions",
    )
    op.drop_index(
        "ix_collective_class_sessions_class_type_id",
        table_name="collective_class_sessions",
    )
    op.drop_index(
        "ix_collective_class_sessions_club_id",
        table_name="collective_class_sessions",
    )
    op.drop_table("collective_class_sessions")

    op.drop_index("ix_collective_class_types_is_active", table_name="collective_class_types")
    op.drop_index("ix_collective_class_types_club_id", table_name="collective_class_types")
    op.drop_table("collective_class_types")
    sa.Enum(name="collective_class_reservation_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="collective_class_session_status").drop(op.get_bind(), checkfirst=True)
