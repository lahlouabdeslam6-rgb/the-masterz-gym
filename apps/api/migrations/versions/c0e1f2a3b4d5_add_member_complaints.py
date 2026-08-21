"""Add member complaints and conversations.

Revision ID: c0e1f2a3b4d5
Revises: b9d0e1f2a3c4
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c0e1f2a3b4d5"
down_revision: str | None = "b9d0e1f2a3c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "complaints",
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("assigned_role", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=180), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
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
            "assigned_role IN ('admin', 'receptionist')",
            name="ck_complaints_assigned_role",
        ),
        sa.ForeignKeyConstraint(["member_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_complaints_assigned_role"),
        "complaints",
        ["assigned_role"],
        unique=False,
    )
    op.create_index(
        op.f("ix_complaints_category"), "complaints", ["category"], unique=False
    )
    op.create_index(
        op.f("ix_complaints_member_id"), "complaints", ["member_id"], unique=False
    )
    op.create_index(
        op.f("ix_complaints_status"), "complaints", ["status"], unique=False
    )

    op.create_table(
        "complaint_messages",
        sa.Column("complaint_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=True),
        sa.Column("author_name", sa.String(length=160), nullable=False),
        sa.Column("author_role", sa.String(length=32), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["author_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_complaint_messages_author_id"),
        "complaint_messages",
        ["author_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_complaint_messages_complaint_id"),
        "complaint_messages",
        ["complaint_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_complaint_messages_created_at"),
        "complaint_messages",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_complaint_messages_created_at"), table_name="complaint_messages"
    )
    op.drop_index(
        op.f("ix_complaint_messages_complaint_id"),
        table_name="complaint_messages",
    )
    op.drop_index(
        op.f("ix_complaint_messages_author_id"), table_name="complaint_messages"
    )
    op.drop_table("complaint_messages")
    op.drop_index(op.f("ix_complaints_status"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_member_id"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_category"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_assigned_role"), table_name="complaints")
    op.drop_table("complaints")
