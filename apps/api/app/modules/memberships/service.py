import uuid
from datetime import date, timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.memberships.models import (
    MembershipPlan,
    Subscription,
    SubscriptionEvent,
    SystemSetting,
)
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.schemas import (
    MembershipPlanCreate,
    MembershipPlanUpdate,
    MemberSubscriptionSummary,
    SettingUpdate,
    SubscriptionDatesUpdate,
    SubscriptionStatusUpdate,
)
from app.modules.users.models import User
from app.shared.enums import ServiceType, SubscriptionStatus
from app.shared.time import add_months, local_today

SETTING_KEYS = {
    "subscription_grace_days",
    "subscription_expiring_soon_days",
    "attendance_duplicate_window_minutes",
    "store_low_stock_threshold",
    "application_pending_retention_days",
}


class MembershipService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = MembershipRepository(session)
        self.audit = AuditService(session)

    def get_setting_int(self, key: str) -> int:
        setting = self.repository.setting(key)
        if not setting or not isinstance(setting.value.get("value"), int):
            raise RuntimeError(f"Le paramètre requis {key!r} n'est pas configuré.")
        return setting.value["value"]

    def create_plan(self, data: MembershipPlanCreate, actor: User) -> MembershipPlan:
        plan = self.repository.add_plan(MembershipPlan(**data.model_dump()))
        self.audit.record(
            actor=actor,
            action="membership_plan.created",
            entity_type="membership_plan",
            entity_id=plan.id,
            new_value=data.model_dump(mode="json"),
        )
        return plan

    def update_plan(
        self, plan_id: uuid.UUID, data: MembershipPlanUpdate, actor: User
    ) -> MembershipPlan:
        plan = self.repository.get_plan(plan_id)
        if not plan:
            raise api_error(status.HTTP_404_NOT_FOUND, "plan_not_found", "Formule introuvable.")
        previous = {
            "name": plan.name,
            "duration_months": plan.duration_months,
            "price": str(plan.price),
            "currency": plan.currency,
            "service_type": plan.service_type.value,
            "session_count": plan.session_count,
            "is_active": plan.is_active,
        }
        changes = data.model_dump(exclude_none=True, exclude={"reason"})
        final_service_type = changes.get("service_type", plan.service_type)
        final_session_count = changes.get("session_count", plan.session_count)
        if final_service_type == ServiceType.RECOVERY and final_session_count is None:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "recovery_session_count_required",
                "Le nombre de seances est requis pour une offre recovery.",
            )
        if final_service_type != ServiceType.RECOVERY:
            changes["session_count"] = None
        for field, value in changes.items():
            setattr(plan, field, value)
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="membership_plan.updated",
            entity_type="membership_plan",
            entity_id=plan.id,
            previous_value=previous,
            new_value={
                **previous,
                **{
                    key: (
                        str(value)
                        if key == "price"
                        else value.value
                        if key == "service_type"
                        else value
                    )
                    for key, value in changes.items()
                },
            },
            reason=data.reason,
        )
        return plan

    def effective_status(
        self, subscription: Subscription, today: date | None = None
    ) -> SubscriptionStatus:
        today = today or local_today()
        if subscription.status in {
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED,
            SubscriptionStatus.SUSPENDED,
        }:
            return subscription.status
        if today < subscription.starts_on:
            return SubscriptionStatus.ACTIVE
        if today <= subscription.ends_on:
            expiring_days = self.get_setting_int("subscription_expiring_soon_days")
            if (subscription.ends_on - today).days <= expiring_days:
                return SubscriptionStatus.EXPIRING_SOON
            return SubscriptionStatus.ACTIVE
        return SubscriptionStatus.EXPIRED

    def list_member_subscription_summaries(
        self, *, query: str | None = None, limit: int = 100
    ) -> list[MemberSubscriptionSummary]:
        today = local_today()
        summaries: list[MemberSubscriptionSummary] = []
        for member, subscription in self.repository.list_members_with_latest_subscription(
            today, query
        ):
            coaching_subscription = self.repository.current_subscription(
                member.id, today, ServiceType.COACHING
            )
            recovery_subscription = self.repository.current_subscription(
                member.id, today, ServiceType.RECOVERY
            )

            def has_active_service(candidate: Subscription | None) -> bool:
                if not candidate or candidate.starts_on > today:
                    return False
                active = self.effective_status(candidate, today) in {
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.EXPIRING_SOON,
                }
                if candidate.service_type == ServiceType.RECOVERY:
                    return active and (candidate.remaining_sessions or 0) > 0
                return active

            effective_status = self.effective_status(subscription, today) if subscription else None
            days_remaining = (
                max((subscription.ends_on - today).days, 0)
                if subscription
                and effective_status
                in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
                else None
            )
            summaries.append(
                MemberSubscriptionSummary(
                    id=member.id,
                    full_name=member.full_name,
                    phone=member.phone,
                    email=member.email,
                    date_of_birth=member.date_of_birth,
                    gender=member.gender,
                    account_status=member.status,
                    member_number=member.member_number or "",
                    created_at=member.created_at,
                    subscription_id=subscription.id if subscription else None,
                    plan_name=subscription.plan_name if subscription else None,
                    starts_on=subscription.starts_on if subscription else None,
                    ends_on=subscription.ends_on if subscription else None,
                    status=subscription.status if subscription else None,
                    effective_status=effective_status,
                    days_remaining=days_remaining,
                    has_active_coaching=has_active_service(coaching_subscription),
                    has_active_recovery=has_active_service(recovery_subscription),
                )
            )

        def renewal_priority(item: MemberSubscriptionSummary) -> tuple[int, int, str]:
            if item.days_remaining is None:
                return (3, 0, item.full_name.casefold())
            if item.days_remaining < 0:
                return (0, abs(item.days_remaining), item.full_name.casefold())
            if item.effective_status == SubscriptionStatus.EXPIRING_SOON:
                return (1, item.days_remaining, item.full_name.casefold())
            return (2, item.days_remaining, item.full_name.casefold())

        return sorted(summaries, key=renewal_priority)[:limit]

    def synchronize_status(self, subscription: Subscription, actor: User) -> SubscriptionStatus:
        effective = self.effective_status(subscription)
        if effective != subscription.status:
            previous = subscription.status
            subscription.status = effective
            self.repository.add_event(
                SubscriptionEvent(
                    subscription_id=subscription.id,
                    event_type="lifecycle_status_synchronized",
                    previous_status=previous,
                    new_status=effective,
                    details={},
                    actor_id=actor.id,
                )
            )
            self.audit.record(
                actor=actor,
                action="subscription.lifecycle_status_changed",
                entity_type="subscription",
                entity_id=subscription.id,
                previous_value={"status": previous.value},
                new_value={"status": effective.value},
            )
        return effective

    def update_status(
        self, subscription_id: uuid.UUID, data: SubscriptionStatusUpdate, actor: User
    ) -> Subscription:
        subscription = self.repository.get_subscription(subscription_id)
        if not subscription:
            raise api_error(
                status.HTTP_404_NOT_FOUND, "subscription_not_found", "Abonnement introuvable."
            )
        previous = subscription.status
        subscription.status = data.status
        self.repository.add_event(
            SubscriptionEvent(
                subscription_id=subscription.id,
                event_type="status_changed",
                previous_status=previous,
                new_status=data.status,
                details={"reason": data.reason},
                actor_id=actor.id,
            )
        )
        self.audit.record(
            actor=actor,
            action="subscription.status_changed",
            entity_type="subscription",
            entity_id=subscription.id,
            previous_value={"status": previous.value},
            new_value={"status": data.status.value},
            reason=data.reason,
        )
        return subscription

    def update_dates(
        self, subscription_id: uuid.UUID, data: SubscriptionDatesUpdate, actor: User
    ) -> Subscription:
        subscription = self.repository.get_subscription(subscription_id)
        if not subscription:
            raise api_error(
                status.HTTP_404_NOT_FOUND, "subscription_not_found", "Abonnement introuvable."
            )
        effective_status = self.effective_status(subscription)
        if effective_status in {
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED,
        }:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "inactive_subscription_dates_locked",
                "Les dates d'un abonnement annule ou expire ne peuvent pas etre modifiees.",
            )

        previous = {
            "starts_on": subscription.starts_on.isoformat(),
            "ends_on": subscription.ends_on.isoformat(),
            "grace_ends_on": subscription.grace_ends_on.isoformat(),
        }
        previous_status = subscription.status
        grace_days = self.get_setting_int("subscription_grace_days")
        subscription.starts_on = data.starts_on
        subscription.ends_on = add_months(data.starts_on, subscription.duration_months) - timedelta(
            days=1
        )
        subscription.grace_ends_on = subscription.ends_on + timedelta(days=grace_days)
        if subscription.status in {
            SubscriptionStatus.EXPIRING_SOON,
            SubscriptionStatus.GRACE_PERIOD,
        }:
            subscription.status = SubscriptionStatus.ACTIVE
        current = {
            "starts_on": subscription.starts_on.isoformat(),
            "ends_on": subscription.ends_on.isoformat(),
            "grace_ends_on": subscription.grace_ends_on.isoformat(),
        }
        self.repository.add_event(
            SubscriptionEvent(
                subscription_id=subscription.id,
                event_type="dates_changed",
                previous_status=previous_status,
                new_status=subscription.status,
                details={"previous": previous, "current": current, "reason": data.reason},
                actor_id=actor.id,
            )
        )
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="subscription.dates_changed",
            entity_type="subscription",
            entity_id=subscription.id,
            previous_value=previous,
            new_value=current,
            reason=data.reason,
        )
        return subscription

    def update_setting(self, key: str, data: SettingUpdate, actor: User) -> SystemSetting:
        if key not in SETTING_KEYS:
            raise api_error(
                status.HTTP_404_NOT_FOUND, "setting_not_found", "Paramètre introuvable."
            )
        setting = self.repository.setting(key)
        previous = setting.value if setting else None
        if setting:
            setting.value = {"value": data.value}
            setting.updated_by_id = actor.id
        else:
            setting = SystemSetting(key=key, value={"value": data.value}, updated_by_id=actor.id)
            self.session.add(setting)
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="setting.updated",
            entity_type="system_setting",
            entity_id=setting.id,
            previous_value=previous,
            new_value=setting.value,
            reason=data.reason,
        )
        return setting
