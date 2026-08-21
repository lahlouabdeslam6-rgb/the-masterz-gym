import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.enums import ComplaintCategory, ComplaintStatus
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class Complaint(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "complaints"
    __table_args__ = (
        CheckConstraint(
            "assigned_role IN ('admin', 'receptionist')",
            name="ck_complaints_assigned_role",
        ),
    )

    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    category: Mapped[ComplaintCategory] = mapped_column(String(32), nullable=False, index=True)
    assigned_role: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(180), nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(
        String(32), nullable=False, default=ComplaintStatus.OPEN, index=True
    )


class ComplaintMessage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "complaint_messages"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    author_name: Mapped[str] = mapped_column(String(160), nullable=False)
    author_role: Mapped[str] = mapped_column(String(32), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        index=True,
    )
