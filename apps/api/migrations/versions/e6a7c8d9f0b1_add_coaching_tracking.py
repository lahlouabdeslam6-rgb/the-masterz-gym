"""Add coaching objectives and assessment history.

Revision ID: e6a7c8d9f0b1
Revises: d4e8a1b3c5f7
Create Date: 2026-08-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e6a7c8d9f0b1"
down_revision: str | None = "d4e8a1b3c5f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    coaching_test_type = postgresql.ENUM(
        "IMPEDANCE",
        "NEUROMUSCULAR",
        "BODY_MEASUREMENTS",
        "RM_STRENGTH",
        "NUTRITION_SURVEY",
        name="coaching_test_type",
        create_type=False,
    )
    postgresql.ENUM(
        "IMPEDANCE",
        "NEUROMUSCULAR",
        "BODY_MEASUREMENTS",
        "RM_STRENGTH",
        "NUTRITION_SURVEY",
        name="coaching_test_type",
    ).create(op.get_bind(), checkfirst=True)

    op.create_table(
        "coaching_client_profiles",
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("updated_by_id", sa.UUID(), nullable=False),
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
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coaching_client_profiles_member_id"),
        "coaching_client_profiles",
        ["member_id"],
        unique=True,
    )

    op.create_table(
        "coaching_assessments",
        sa.Column("assignment_id", sa.UUID(), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("coach_id", sa.UUID(), nullable=False),
        sa.Column("test_type", coaching_test_type, nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
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
        sa.ForeignKeyConstraint(["assignment_id"], ["coach_member_assignments.id"]),
        sa.ForeignKeyConstraint(["coach_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_coaching_assessments_assignment_id"),
        "coaching_assessments",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coaching_assessments_coach_id"),
        "coaching_assessments",
        ["coach_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coaching_assessments_member_id"),
        "coaching_assessments",
        ["member_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coaching_assessments_test_type"),
        "coaching_assessments",
        ["test_type"],
        unique=False,
    )
    op.create_index(
        "ix_coaching_assessments_member_measured_at",
        "coaching_assessments",
        ["member_id", "measured_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_coaching_assessments_member_measured_at",
        table_name="coaching_assessments",
    )
    op.drop_index(
        op.f("ix_coaching_assessments_test_type"),
        table_name="coaching_assessments",
    )
    op.drop_index(
        op.f("ix_coaching_assessments_member_id"),
        table_name="coaching_assessments",
    )
    op.drop_index(
        op.f("ix_coaching_assessments_coach_id"),
        table_name="coaching_assessments",
    )
    op.drop_index(
        op.f("ix_coaching_assessments_assignment_id"),
        table_name="coaching_assessments",
    )
    op.drop_table("coaching_assessments")
    op.drop_index(
        op.f("ix_coaching_client_profiles_member_id"),
        table_name="coaching_client_profiles",
    )
    op.drop_table("coaching_client_profiles")
    sa.Enum(name="coaching_test_type").drop(op.get_bind(), checkfirst=True)
