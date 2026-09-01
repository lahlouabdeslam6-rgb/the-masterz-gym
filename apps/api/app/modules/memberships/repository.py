import uuid
from datetime import date

from sqlalchemy import and_, case, or_, select
from sqlalchemy.orm import Session

from app.modules.clubs.models import UserClubAssignment
from app.modules.memberships.models import (
    MembershipPlan,
    Subscription,
    SubscriptionEvent,
    SystemSetting,
)
from app.modules.users.models import User
from app.shared.enums import ServiceType, SubscriptionStatus, UserRole

RUNNING_SUBSCRIPTION_STATUSES = (
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.EXPIRING_SOON,
    SubscriptionStatus.GRACE_PERIOD,
)


def subscription_priority(on_date: date):
    return case(
        (
            and_(
                Subscription.status.in_(RUNNING_SUBSCRIPTION_STATUSES),
                Subscription.ends_on >= on_date,
            ),
            0,
        ),
        else_=1,
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

    def list_plans(
        self,
        *,
        active_only: bool = False,
        service_type: ServiceType | None = None,
        club_id: uuid.UUID | None = None,
    ) -> list[MembershipPlan]:
        statement = select(MembershipPlan).order_by(MembershipPlan.duration_months)
        if active_only:
            statement = statement.where(MembershipPlan.is_active.is_(True))
        if service_type:
            statement = statement.where(MembershipPlan.service_type == service_type)
        if club_id:
            statement = statement.where(MembershipPlan.club_id == club_id)
        return list(self.session.scalars(statement))

    def setting(self, key: str) -> SystemSetting | None:
        return self.session.scalar(select(SystemSetting).where(SystemSetting.key == key))

    def list_settings(self) -> list[SystemSetting]:
        return list(self.session.scalars(select(SystemSetting).order_by(SystemSetting.key)))

    def add_subscription(self, subscription: Subscription) -> Subscription:
        self.session.add(subscription)
        self.session.flush()
        return subscription

    def get_subscription(self, subscription_id: uuid.UUID) -> Subscription | None:
        return self.session.get(Subscription, subscription_id)

    def current_subscription(
        self,
        member_id: uuid.UUID,
        on_date: date,
        service_type: ServiceType,
        club_id: uuid.UUID | None = None,
    ) -> Subscription | None:
        statement = select(Subscription).where(
            Subscription.member_id == member_id,
            Subscription.service_type == service_type,
        )
        if club_id:
            statement = statement.where(Subscription.club_id == club_id)
        return self.session.scalar(
            statement.order_by(
                subscription_priority(on_date),
                Subscription.created_at.desc(),
                Subscription.ends_on.desc(),
            ).limit(1)
        )

    def access_subscription(
        self, member_id: uuid.UUID, on_date: date, club_id: uuid.UUID | None = None
    ) -> Subscription | None:
        statement = select(Subscription).where(
            Subscription.member_id == member_id,
            Subscription.service_type == ServiceType.GYM,
            Subscription.starts_on <= on_date,
        )
        if club_id:
            statement = statement.where(Subscription.club_id == club_id)
        return self.session.scalar(
            statement.order_by(
                subscription_priority(on_date),
                Subscription.created_at.desc(),
                Subscription.ends_on.desc(),
            ).limit(1)
        )

    def list_member_subscriptions(
        self, member_id: uuid.UUID, club_id: uuid.UUID | None = None
    ) -> list[Subscription]:
        statement = select(Subscription).where(Subscription.member_id == member_id)
        if club_id:
            statement = statement.where(Subscription.club_id == club_id)
        return list(self.session.scalars(statement.order_by(Subscription.starts_on.desc())))

    def list_members_with_latest_subscription(
        self, on_date: date, query: str | None = None, club_id: uuid.UUID | None = None
    ) -> list[tuple[User, Subscription | None]]:
        latest_subscription_id = (
            select(Subscription.id)
            .where(
                Subscription.member_id == User.id,
                Subscription.service_type == ServiceType.GYM,
                *([Subscription.club_id == club_id] if club_id else []),
            )
            .order_by(
                subscription_priority(on_date),
                Subscription.created_at.desc(),
                Subscription.ends_on.desc(),
            )
            .limit(1)
            .correlate(User)
            .scalar_subquery()
        )
        statement = (
            select(User, Subscription)
            .outerjoin(Subscription, Subscription.id == latest_subscription_id)
            .where(User.role == UserRole.MEMBER)
        )
        if club_id:
            statement = statement.join(
                UserClubAssignment,
                UserClubAssignment.user_id == User.id,
            ).where(UserClubAssignment.club_id == club_id)
        if query and query.strip():
            pattern = f"%{query.strip()}%"
            statement = statement.where(
                or_(
                    User.full_name.ilike(pattern),
                    User.phone.ilike(pattern),
                    User.member_number.ilike(pattern),
                )
            )
        return [(member, subscription) for member, subscription in self.session.execute(statement)]

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
