"""Add coach member assignments.

Revision ID: c2a9f4e6b8d1
Revises: 8f3d1b2c4a5e
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c2a9f4e6b8d1"
down_revision: str | None = "8f3d1b2c4a5e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "coach_member_assignments",
        sa.Column("coach_id", sa.UUID(), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by_id", sa.UUID(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
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
        sa.CheckConstraint("coach_id <> member_id", name="ck_coach_assignments_distinct_users"),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["coach_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coach_member_assignments_coach_id"),
        "coach_member_assignments",
        ["coach_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coach_member_assignments_member_id"),
        "coach_member_assignments",
        ["member_id"],
        unique=False,
    )
    op.create_index(
        "uq_coach_assignments_active_member",
        "coach_member_assignments",
        ["member_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_coach_assignments_active_member",
        table_name="coach_member_assignments",
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.drop_index(
        op.f("ix_coach_member_assignments_member_id"),
        table_name="coach_member_assignments",
    )
    op.drop_index(
        op.f("ix_coach_member_assignments_coach_id"),
        table_name="coach_member_assignments",
    )
    op.drop_table("coach_member_assignments")
