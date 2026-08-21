import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.enums import ServiceType, SubscriptionStatus
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class MembershipPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "membership_plans"
    __table_args__ = (
        CheckConstraint("duration_months > 0", name="ck_membership_plans_duration_positive"),
        CheckConstraint("price > 0", name="ck_membership_plans_price_positive"),
        CheckConstraint(
            "session_count IS NULL OR session_count > 0",
            name="ck_membership_plans_session_count_positive",
        ),
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type"),
        nullable=False,
        default=ServiceType.GYM,
        index=True,
    )
    session_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class SystemSetting(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint("starts_on <= ends_on", name="ck_subscriptions_date_range"),
        CheckConstraint("ends_on <= grace_ends_on", name="ck_subscriptions_grace_range"),
        CheckConstraint("duration_months > 0", name="ck_subscriptions_duration_positive"),
        CheckConstraint("price > 0", name="ck_subscriptions_price_positive"),
        CheckConstraint(
            "total_sessions IS NULL OR total_sessions > 0",
            name="ck_subscriptions_total_sessions_positive",
        ),
        CheckConstraint(
            "remaining_sessions IS NULL OR remaining_sessions >= 0",
            name="ck_subscriptions_remaining_sessions_non_negative",
        ),
        CheckConstraint(
            "remaining_sessions IS NULL OR total_sessions IS NULL "
            "OR remaining_sessions <= total_sessions",
            name="ck_subscriptions_remaining_sessions_within_total",
        ),
    )

    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membership_plans.id"), nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"), nullable=False, index=True
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    grace_ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    plan_name: Mapped[str] = mapped_column(String(120), nullable=False)
    duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type", create_type=False),
        nullable=False,
        default=ServiceType.GYM,
        index=True,
    )
    total_sessions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remaining_sessions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class SubscriptionEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "subscription_events"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    previous_status: Mapped[SubscriptionStatus | None] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status", create_type=False), nullable=True
    )
    new_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status", create_type=False), nullable=False
    )
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
