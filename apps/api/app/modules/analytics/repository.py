from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.applications.models import MembershipApplication
from app.modules.attendance.models import Attendance
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.payments.models import Payment
from app.modules.users.models import User
from app.shared.enums import SubscriptionStatus, UserRole


class AnalyticsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_members(self) -> list[User]:
        return list(self.session.scalars(select(User).where(User.role == UserRole.MEMBER)))

    def list_subscriptions(self) -> list[Subscription]:
        return list(self.session.scalars(select(Subscription)))

    def list_payments_since(self, starts_at: datetime) -> list[tuple[Payment, Subscription]]:
        return [
            (payment, subscription)
            for payment, subscription in self.session.execute(
                select(Payment, Subscription)
                .join(Subscription, Subscription.id == Payment.subscription_id)
                .where(Payment.paid_at >= starts_at)
                .where(Subscription.status != SubscriptionStatus.CANCELLED)
                .order_by(Payment.paid_at)
            )
        ]

    def list_applications(self) -> list[MembershipApplication]:
        return list(self.session.scalars(select(MembershipApplication)))

    def count_check_ins_since(self, starts_at: datetime) -> int:
        return int(
            self.session.scalar(
                select(func.count(Attendance.id)).where(Attendance.checked_in_at >= starts_at)
            )
            or 0
        )

    def first_plan_currency(self) -> str | None:
        return self.session.scalar(
            select(MembershipPlan.currency).order_by(MembershipPlan.created_at.desc()).limit(1)
        )
