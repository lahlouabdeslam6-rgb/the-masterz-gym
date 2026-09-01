import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.clubs.constants import SALLE_1_ID
from app.shared.enums import (
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    CoachingTestType,
)
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


class CoachingAssignmentRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_assignment_requests"
    __table_args__ = (
        CheckConstraint(
            "preferred_coach_id IS NULL OR preferred_coach_id <> member_id",
            name="ck_coaching_assignment_request_preferred_distinct",
        ),
        CheckConstraint(
            "assigned_coach_id IS NULL OR assigned_coach_id <> member_id",
            name="ck_coaching_assignment_request_assigned_distinct",
        ),
        Index(
            "uq_coaching_assignment_requests_pending_member",
            "member_id",
            unique=True,
            postgresql_where=text("status = 'PENDING'"),
        ),
    )

    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    preferred_coach_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    assigned_coach_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    status: Mapped[CoachingAssignmentRequestStatus] = mapped_column(
        Enum(
            CoachingAssignmentRequestStatus,
            name="coaching_assignment_request_status",
        ),
        nullable=False,
        default=CoachingAssignmentRequestStatus.PENDING,
        index=True,
    )
    member_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CoachingClientProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_client_profiles"

    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class CoachingAssessment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_assessments"
    __table_args__ = (
        Index(
            "ix_coaching_assessments_member_measured_at",
            "member_id",
            "measured_at",
        ),
    )

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coach_member_assignments.id"), nullable=False, index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    test_type: Mapped[CoachingTestType] = mapped_column(
        Enum(CoachingTestType, name="coaching_test_type"), nullable=False, index=True
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metrics: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class CoachAvailability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coach_availabilities"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_coach_availability_valid_period"),
        CheckConstraint(
            "session_duration_minutes BETWEEN 15 AND 240",
            name="ck_coach_availability_session_duration",
        ),
        Index("ix_coach_availability_coach_starts_at", "coach_id", "starts_at"),
    )

    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id"),
        nullable=False,
        default=SALLE_1_ID,
        server_default=str(SALLE_1_ID),
        index=True,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    session_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class CoachingBooking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_bookings"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_coaching_booking_valid_period"),
        Index("ix_coaching_bookings_coach_starts_at", "coach_id", "starts_at"),
        Index("ix_coaching_bookings_member_starts_at", "member_id", "starts_at"),
        Index(
            "uq_coaching_bookings_member_availability_start",
            "member_id",
            "availability_id",
            "starts_at",
            unique=True,
        ),
    )

    availability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coach_availabilities.id"), nullable=False, index=True
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id"),
        nullable=False,
        default=SALLE_1_ID,
        server_default=str(SALLE_1_ID),
        index=True,
    )
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coach_member_assignments.id"), nullable=False, index=True
    )
    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[CoachingBookingStatus] = mapped_column(
        Enum(CoachingBookingStatus, name="coaching_booking_status"),
        nullable=False,
        default=CoachingBookingStatus.REQUESTED,
        index=True,
    )
    member_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    conflict_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class CoachingMessage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_messages"
    __table_args__ = (
        CheckConstraint(
            "body IS NOT NULL OR media_url IS NOT NULL",
            name="ck_coaching_messages_content",
        ),
        CheckConstraint(
            "media_type IS NULL OR media_type IN ('image', 'audio')",
            name="ck_coaching_messages_media_type",
        ),
        Index("ix_coaching_messages_assignment_created", "assignment_id", "created_at"),
    )

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coach_member_assignments.id"), nullable=False, index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
