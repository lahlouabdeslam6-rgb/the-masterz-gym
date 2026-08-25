import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class Promotion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "promotions"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_promotions_price_positive"),
        CheckConstraint("participant_count > 0", name="ck_promotions_participant_count_positive"),
        CheckConstraint("starts_at < ends_at", name="ck_promotions_date_range"),
    )

    title: Mapped[str] = mapped_column(String(140), nullable=False)
    slug: Mapped[str] = mapped_column(String(170), nullable=False, unique=True, index=True)
    short_description: Mapped[str] = mapped_column(String(280), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    base_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membership_plans.id"), nullable=False, index=True
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MAD")
    participant_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
