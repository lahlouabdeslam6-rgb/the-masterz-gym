import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.memberships.models import (
    MembershipPlan,
    Subscription,
    SubscriptionEvent,
    SystemSetting,
)


class MembershipRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add_plan(self, plan: MembershipPlan) -> MembershipPlan:
        self.session.add(plan)
        self.session.flush()
        return plan

    def get_plan(self, plan_id: uuid.UUID) -> MembershipPlan | None:
        return self.session.get(MembershipPlan, plan_id)

    def list_plans(self, *, active_only: bool = False) -> list[MembershipPlan]:
        statement = select(MembershipPlan).order_by(MembershipPlan.duration_months)
        if active_only:
            statement = statement.where(MembershipPlan.is_active.is_(True))
        return list(self.session.scalars(statement))

    def setting(self, key: str) -> SystemSetting | None:
        return self.session.scalar(select(SystemSetting).where(SystemSetting.key == key))

    def add_subscription(self, subscription: Subscription) -> Subscription:
        self.session.add(subscription)
        self.session.flush()
        return subscription

    def get_subscription(self, subscription_id: uuid.UUID) -> Subscription | None:
        return self.session.get(Subscription, subscription_id)

    def current_subscription(self, member_id: uuid.UUID) -> Subscription | None:
        return self.session.scalar(
            select(Subscription)
            .where(Subscription.member_id == member_id)
            .order_by(Subscription.ends_on.desc(), Subscription.created_at.desc())
            .limit(1)
        )

    def access_subscription(self, member_id: uuid.UUID, on_date: date) -> Subscription | None:
        return self.session.scalar(
            select(Subscription)
            .where(
                Subscription.member_id == member_id,
                Subscription.starts_on <= on_date,
            )
            .order_by(Subscription.ends_on.desc(), Subscription.created_at.desc())
            .limit(1)
        )

    def list_member_subscriptions(self, member_id: uuid.UUID) -> list[Subscription]:
        return list(
            self.session.scalars(
                select(Subscription)
                .where(Subscription.member_id == member_id)
                .order_by(Subscription.starts_on.desc())
            )
        )

    def add_event(self, event: SubscriptionEvent) -> SubscriptionEvent:
        self.session.add(event)
        self.session.flush()
        return event

    def list_events(self, subscription_id: uuid.UUID) -> list[SubscriptionEvent]:
        return list(
            self.session.scalars(
                select(SubscriptionEvent)
                .where(SubscriptionEvent.subscription_id == subscription_id)
                .order_by(SubscriptionEvent.created_at)
            )
        )
