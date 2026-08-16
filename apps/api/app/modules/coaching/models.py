import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class CoachMemberAssignment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coach_member_assignments"
    __table_args__ = (
        CheckConstraint("coach_id <> member_id", name="ck_coach_assignments_distinct_users"),
        Index(
            "uq_coach_assignments_active_member",
            "member_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
    )

    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
