"""Add coaching assignment requests.

Revision ID: d8e9f0a1b2c3
Revises: a4b5c6d7e8f9
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d8e9f0a1b2c3"
down_revision: str | None = "a4b5c6d7e8f9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    request_status = postgresql.ENUM(
        "PENDING",
        "APPROVED",
        "REJECTED",
        name="coaching_assignment_request_status",
        create_type=False,
    )
    postgresql.ENUM(
        "PENDING",
        "APPROVED",
        "REJECTED",
        name="coaching_assignment_request_status",
    ).create(op.get_bind(), checkfirst=True)

    op.create_table(
        "coaching_assignment_requests",
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("preferred_coach_id", sa.UUID(), nullable=True),
        sa.Column("assigned_coach_id", sa.UUID(), nullable=True),
        sa.Column(
            "status",
            request_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("member_note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("decided_by_id", sa.UUID(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
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
            "preferred_coach_id IS NULL OR preferred_coach_id <> member_id",
            name="ck_coaching_assignment_request_preferred_distinct",
        ),
        sa.CheckConstraint(
            "assigned_coach_id IS NULL OR assigned_coach_id <> member_id",
            name="ck_coaching_assignment_request_assigned_distinct",
        ),
        sa.ForeignKeyConstraint(["assigned_coach_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["decided_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["preferred_coach_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "member_id",
        "preferred_coach_id",
        "assigned_coach_id",
        "status",
    ):
        op.create_index(
            op.f(f"ix_coaching_assignment_requests_{column}"),
            "coaching_assignment_requests",
            [column],
            unique=False,
        )
    op.create_index(
        "uq_coaching_assignment_requests_pending_member",
        "coaching_assignment_requests",
        ["member_id"],
        unique=True,
        postgresql_where=sa.text("status = 'PENDING'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_coaching_assignment_requests_pending_member",
        table_name="coaching_assignment_requests",
    )
    for column in (
        "status",
        "assigned_coach_id",
        "preferred_coach_id",
        "member_id",
    ):
        op.drop_index(
            op.f(f"ix_coaching_assignment_requests_{column}"),
            table_name="coaching_assignment_requests",
        )
    op.drop_table("coaching_assignment_requests")
    sa.Enum(name="coaching_assignment_request_status").drop(op.get_bind(), checkfirst=True)
