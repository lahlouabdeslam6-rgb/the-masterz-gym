from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel

from app.shared.enums import PaymentMethod, ServiceType


class DashboardSubscriptionStatusValue(StrEnum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    GRACE_PERIOD = "grace_period"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SESSIONS_EXHAUSTED = "sessions_exhausted"
    SERVICE_COMPLETED = "service_completed"


class DashboardMetrics(BaseModel):
    revenue: Decimal
    previous_revenue: Decimal
    revenue_change_percent: float | None
    payment_count: int
    member_count: int
    active_member_count: int
    active_subscriptions: int
    expiring_subscriptions: int
    pending_applications: int
    check_ins: int


class DashboardMonthlyPoint(BaseModel):
    month: str
    revenue: Decimal
    payments: int
    new_members: int


class DashboardServiceRevenue(BaseModel):
    service_type: ServiceType
    amount: Decimal
    payments: int


class DashboardPaymentMethod(BaseModel):
    method: PaymentMethod
    amount: Decimal
    payments: int


class DashboardSubscriptionStatus(BaseModel):
    status: DashboardSubscriptionStatusValue
    count: int


class AdminDashboardRead(BaseModel):
    generated_at: datetime
    period_months: int
    currency: str | None
    metrics: DashboardMetrics
    monthly: list[DashboardMonthlyPoint]
    service_revenue: list[DashboardServiceRevenue]
    payment_methods: list[DashboardPaymentMethod]
    subscription_statuses: list[DashboardSubscriptionStatus]
