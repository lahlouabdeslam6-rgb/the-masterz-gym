"""Add the multi-club foundation and assign existing data to Salle 1.

Revision ID: 0a1b2c3d4e5f
Revises: f9a0b1c2d3e4
Create Date: 2026-08-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0a1b2c3d4e5f"
down_revision: str | None = "f9a0b1c2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SALLE_1_ID = "11111111-1111-4111-8111-111111111111"
SALLE_2_ID = "22222222-2222-4222-8222-222222222222"

CLUB_SCOPED_TABLES = (
    "membership_plans",
    "membership_applications",
    "subscriptions",
    "payments",
    "attendances",
    "coach_availabilities",
    "coaching_bookings",
    "recovery_visits",
    "store_products",
    "store_reservations",
    "store_sales",
    "cafe_menu_items",
)


def upgrade() -> None:
    op.create_table(
        "clubs",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clubs_slug", "clubs", ["slug"], unique=True)
    op.create_index("ix_clubs_is_active", "clubs", ["is_active"], unique=False)
    op.execute(
        sa.text(
            """
            INSERT INTO clubs (id, name, label, slug, address, is_active)
            VALUES
              (CAST(:salle_1_id AS uuid), 'Morocco Master Gym', 'Salle 1', 'salle-1', NULL, true),
              (CAST(:salle_2_id AS uuid), 'Morocco Master Gym', 'Salle 2', 'salle-2', NULL, true)
            """
        ).bindparams(salle_1_id=SALLE_1_ID, salle_2_id=SALLE_2_ID)
    )

    op.create_table(
        "user_club_assignments",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "club_id"),
    )
    op.create_index(
        "ix_user_club_assignments_user_id", "user_club_assignments", ["user_id"], unique=False
    )
    op.create_index(
        "ix_user_club_assignments_club_id", "user_club_assignments", ["club_id"], unique=False
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_club_assignments (id, user_id, club_id, assigned_by_id)
            SELECT gen_random_uuid(), id, CAST(:salle_1_id AS uuid), NULL FROM users
            """
        ).bindparams(salle_1_id=SALLE_1_ID)
    )
    op.execute(
        sa.text(
            """
            INSERT INTO user_club_assignments (id, user_id, club_id, assigned_by_id)
            SELECT gen_random_uuid(), id, CAST(:salle_2_id AS uuid), NULL
            FROM users
            WHERE role = 'ADMIN'
            """
        ).bindparams(salle_2_id=SALLE_2_ID)
    )

    for table_name in CLUB_SCOPED_TABLES:
        op.add_column(
            table_name,
            sa.Column(
                "club_id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text(f"'{SALLE_1_ID}'::uuid"),
                nullable=False,
            ),
        )
        op.create_foreign_key(
            f"fk_{table_name}_club_id_clubs",
            table_name,
            "clubs",
            ["club_id"],
            ["id"],
        )
        op.create_index(f"ix_{table_name}_club_id", table_name, ["club_id"], unique=False)


def downgrade() -> None:
    for table_name in reversed(CLUB_SCOPED_TABLES):
        op.drop_index(f"ix_{table_name}_club_id", table_name=table_name)
        op.drop_constraint(f"fk_{table_name}_club_id_clubs", table_name, type_="foreignkey")
        op.drop_column(table_name, "club_id")

    op.drop_index("ix_user_club_assignments_club_id", table_name="user_club_assignments")
    op.drop_index("ix_user_club_assignments_user_id", table_name="user_club_assignments")
    op.drop_table("user_club_assignments")
    op.drop_index("ix_clubs_is_active", table_name="clubs")
    op.drop_index("ix_clubs_slug", table_name="clubs")
    op.drop_table("clubs")
