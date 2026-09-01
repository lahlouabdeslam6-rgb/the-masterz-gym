import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.enums import (
    CollectiveClassReservationStatus,
    CollectiveClassSessionStatus,
)
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class CollectiveClassType(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "collective_class_types"
    __table_args__ = (
        UniqueConstraint("club_id", "name", name="uq_collective_class_type_club_name"),
        CheckConstraint("default_duration_minutes > 0", name="ck_class_type_duration_positive"),
        CheckConstraint("default_capacity > 0", name="ck_class_type_capacity_positive"),
    )

    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    default_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)


class CollectiveClassSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "collective_class_sessions"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_collective_session_dates"),
        CheckConstraint("capacity > 0", name="ck_collective_session_capacity_positive"),
    )

    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True
    )
    class_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collective_class_types.id"), nullable=False, index=True
    )
    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CollectiveClassSessionStatus] = mapped_column(
        Enum(CollectiveClassSessionStatus, name="collective_class_session_status"),
        nullable=False,
        default=CollectiveClassSessionStatus.SCHEDULED,
        index=True,
    )


class CollectiveClassReservation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "collective_class_reservations"
    __table_args__ = (
        UniqueConstraint("session_id", "member_id", name="uq_collective_reservation_member"),
        CheckConstraint(
            "status != 'WAITLISTED' OR waitlist_position IS NOT NULL",
            name="ck_collective_reservation_waitlist_position",
        ),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collective_class_sessions.id"), nullable=False, index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    status: Mapped[CollectiveClassReservationStatus] = mapped_column(
        Enum(
            CollectiveClassReservationStatus,
            name="collective_class_reservation_status",
        ),
        nullable=False,
        index=True,
    )
    waitlist_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cancelled_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
