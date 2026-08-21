"""Backfill session balances for legacy recovery packs.

Revision ID: a8c9d0e1f2b3
Revises: f7b8c9d0e1a2
Create Date: 2026-08-21
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a8c9d0e1f2b3"
down_revision: str | None = "f7b8c9d0e1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Recovery offers created before session packs existed often included the
    # number of sessions at the start of their name (for example "4 seances").
    op.execute(
        r"""
        UPDATE membership_plans
        SET session_count = substring(name from '^\s*([1-9][0-9]*)')::integer
        WHERE service_type = 'RECOVERY'
          AND session_count IS NULL
          AND name ~ '^\s*[1-9][0-9]*'
        """
    )
    op.execute(
        """
        UPDATE subscriptions AS subscription
        SET total_sessions = plan.session_count,
            remaining_sessions = plan.session_count
        FROM membership_plans AS plan
        WHERE subscription.plan_id = plan.id
          AND subscription.service_type = 'RECOVERY'
          AND subscription.total_sessions IS NULL
          AND plan.session_count IS NOT NULL
        """
    )


def downgrade() -> None:
    # This is a corrective data migration. Reverting valid balances would make
    # recovery subscriptions unusable again, so the downgrade is intentionally
    # non-destructive.
    pass
