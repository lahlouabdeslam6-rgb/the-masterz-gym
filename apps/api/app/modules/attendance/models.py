import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.clubs.constants import SALLE_1_ID
from app.shared.enums import AttendanceDecision
from app.shared.models import UUIDPrimaryKeyMixin


class Attendance(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "attendances"

    member_id: Mapped[uuid.UUID] = mapped_column(
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
    receptionist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True
    )
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    subscription_status_at_entry: Mapped[str] = mapped_column(String(40), nullable=False)
    decision: Mapped[AttendanceDecision] = mapped_column(
        Enum(AttendanceDecision, name="attendance_decision"), nullable=False
    )
    exceptional_access_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
