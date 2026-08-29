from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.schemas import (
    AdminDashboardRead,
    DashboardMetrics,
    DashboardMonthlyPoint,
    DashboardPaymentMethod,
    DashboardServiceRevenue,
    DashboardSubscriptionStatus,
)
from app.modules.memberships.service import MembershipService
from app.shared.enums import (
    AccountStatus,
    ApplicationStatus,
    PaymentMethod,
    ServiceType,
    SubscriptionStatus,
)
from app.shared.time import add_months, local_today


class AnalyticsService:
    def __init__(self, session: Session) -> None:
        self.repository = AnalyticsRepository(session)
        self.memberships = MembershipService(session)

    def dashboard(self, months: int) -> AdminDashboardRead:
        timezone = ZoneInfo(settings.gym_timezone)
        generated_at = datetime.now(timezone)
        current_month = generated_at.date().replace(day=1)
        period_start_date = add_months(current_month, -(months - 1))
        previous_start_date = add_months(period_start_date, -months)
        period_start = datetime.combine(period_start_date, datetime.min.time(), timezone)
        previous_start = datetime.combine(previous_start_date, datetime.min.time(), timezone)

        members = self.repository.list_members()
        subscriptions = self.repository.list_subscriptions()
        payments = self.repository.list_payments_since(previous_start)
        applications = self.repository.list_applications()
        current_payments = [item for item in payments if item[0].paid_at >= period_start]
        previous_payments = [item for item in payments if item[0].paid_at < period_start]

        revenue = sum((payment.amount for payment, _ in current_payments), Decimal("0"))
        previous_revenue = sum((payment.amount for payment, _ in previous_payments), Decimal("0"))
        revenue_change = (
            float(((revenue - previous_revenue) / previous_revenue) * 100)
            if previous_revenue
            else None
        )

        today = local_today()
        expiring_days = self.memberships.get_setting_int("subscription_expiring_soon_days")
        effective_statuses = [
            self.memberships.effective_status(subscription, today, expiring_days=expiring_days)
            for subscription in subscriptions
        ]
        active_statuses = {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.EXPIRING_SOON,
            SubscriptionStatus.GRACE_PERIOD,
        }

        monthly = {
            add_months(period_start_date, offset).strftime("%Y-%m"): {
                "revenue": Decimal("0"),
                "payments": 0,
                "new_members": 0,
            }
            for offset in range(months)
        }
        for payment, _ in current_payments:
            bucket = monthly.get(payment.paid_at.astimezone(timezone).strftime("%Y-%m"))
            if bucket is not None:
                bucket["revenue"] += payment.amount
                bucket["payments"] += 1
        for member in members:
            bucket = monthly.get(member.created_at.astimezone(timezone).strftime("%Y-%m"))
            if bucket is not None:
                bucket["new_members"] += 1

        service_amounts: dict[ServiceType, Decimal] = defaultdict(lambda: Decimal("0"))
        service_counts: Counter[ServiceType] = Counter()
        method_amounts: dict[PaymentMethod, Decimal] = defaultdict(lambda: Decimal("0"))
        method_counts: Counter[PaymentMethod] = Counter()
        currencies: Counter[str] = Counter()
        for payment, subscription in current_payments:
            service_amounts[subscription.service_type] += payment.amount
            service_counts[subscription.service_type] += 1
            method_amounts[payment.method] += payment.amount
            method_counts[payment.method] += 1
            currencies[payment.currency] += 1

        status_counts = Counter(effective_statuses)
        currency = (
            currencies.most_common(1)[0][0] if currencies else self.repository.first_plan_currency()
        )

        return AdminDashboardRead(
            generated_at=generated_at,
            period_months=months,
            currency=currency,
            metrics=DashboardMetrics(
                revenue=revenue,
                previous_revenue=previous_revenue,
                revenue_change_percent=revenue_change,
                payment_count=len(current_payments),
                member_count=len(members),
                active_member_count=sum(
                    member.status == AccountStatus.ACTIVE for member in members
                ),
                active_subscriptions=sum(
                    status in active_statuses for status in effective_statuses
                ),
                expiring_subscriptions=status_counts[SubscriptionStatus.EXPIRING_SOON],
                pending_applications=sum(
                    application.status == ApplicationStatus.PENDING for application in applications
                ),
                check_ins=self.repository.count_check_ins_since(period_start),
            ),
            monthly=[
                DashboardMonthlyPoint(month=month, **values) for month, values in monthly.items()
            ],
            service_revenue=[
                DashboardServiceRevenue(
                    service_type=service_type,
                    amount=service_amounts[service_type],
                    payments=service_counts[service_type],
                )
                for service_type in ServiceType
            ],
            payment_methods=[
                DashboardPaymentMethod(
                    method=method,
                    amount=method_amounts[method],
                    payments=method_counts[method],
                )
                for method in PaymentMethod
            ],
            subscription_statuses=[
                DashboardSubscriptionStatus(status=status, count=status_counts[status])
                for status in SubscriptionStatus
            ],
        )
