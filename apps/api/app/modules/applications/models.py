import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.enums import ApplicationStatus, Gender
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class MembershipApplication(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "membership_applications"
    __table_args__ = (
        CheckConstraint(
            "promotion_participant_count IS NULL OR promotion_participant_count > 0",
            name="ck_membership_applications_promotion_participants_positive",
        ),
    )

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, name="gender"), nullable=True)
    selected_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membership_plans.id"), nullable=False
    )
    promotion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True
    )
    promotion_title: Mapped[str | None] = mapped_column(String(140), nullable=True)
    promotion_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    promotion_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    promotion_participant_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fitness_objective: Mapped[str | None] = mapped_column(String(500), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"),
        nullable=False,
        default=ApplicationStatus.PENDING,
        index=True,
    )
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    converted_member_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
