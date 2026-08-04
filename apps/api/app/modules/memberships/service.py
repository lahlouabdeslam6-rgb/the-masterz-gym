import uuid
from datetime import date

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
    SettingUpdate,
    SubscriptionStatusUpdate,
)
from app.modules.users.models import User
from app.shared.enums import SubscriptionStatus
from app.shared.time import local_today

SETTING_KEYS = {
    "subscription_grace_days",
    "subscription_expiring_soon_days",
    "attendance_duplicate_window_minutes",
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
            "is_active": plan.is_active,
        }
        changes = data.model_dump(exclude_none=True, exclude={"reason"})
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
                **{k: str(v) if k == "price" else v for k, v in changes.items()},
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
        if today <= subscription.grace_ends_on:
            return SubscriptionStatus.GRACE_PERIOD
        return SubscriptionStatus.SUSPENDED

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
