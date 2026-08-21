import uuid
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.memberships.models import Subscription, SubscriptionEvent
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.notifications.service import NotificationService
from app.modules.recovery.models import RecoveryVisit
from app.modules.recovery.repository import RecoveryRepository
from app.modules.recovery.schemas import (
    RecoveryClientSummary,
    RecoverySubscriptionSummary,
    RecoveryTrackingRead,
    RecoveryVisitCreate,
    RecoveryVisitRead,
)
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import RecoveryService, SubscriptionStatus, UserRole
from app.shared.time import local_today


class RecoveryServiceManager:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.recovery = RecoveryRepository(session)
        self.memberships = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.notifications = NotificationService(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    def list_clients(
        self, *, query: str | None = None, limit: int = 100
    ) -> list[RecoveryClientSummary]:
        return [
            RecoveryClientSummary(
                member_id=member.id,
                member_name=member.full_name,
                member_number=member.member_number or "",
                phone=member.phone,
                subscription=self._subscription_summary(subscription),
            )
            for member, subscription in self.recovery.list_clients(query=query, limit=limit)
        ]

    def get_tracking(
        self, member_id: uuid.UUID, actor: User, *, limit: int = 100
    ) -> RecoveryTrackingRead:
        member = self._member_for_tracking(member_id, actor)
        return RecoveryTrackingRead(
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            subscriptions=[
                self._subscription_summary(subscription)
                for subscription in self.recovery.list_subscriptions(member.id)
            ],
            visits=[
                self._visit_read(visit)
                for visit in self.recovery.list_visits(member.id, limit=limit)
            ],
        )

    def record_visit(self, data: RecoveryVisitCreate, actor: User) -> RecoveryVisitRead:
        self.recovery.lock_idempotency_key(data.idempotency_key)
        existing = self.recovery.visit_by_idempotency_key(data.idempotency_key)
        if existing:
            if existing.member_id != data.member_id:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "recovery_idempotency_conflict",
                    "Cette cle a deja ete utilisee pour un autre passage.",
                )
            return self._visit_read(existing)

        member = self.users.get(data.member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")

        now = datetime.now(UTC)
        if data.occurred_at.astimezone(UTC) > now:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "future_recovery_visit",
                "Un passage recovery ne peut pas etre enregistre dans le futur.",
            )
        on_date = data.occurred_at.astimezone(ZoneInfo(settings.gym_timezone)).date()
        subscription = self.recovery.usable_subscription_for_update(member.id, on_date)
        if not subscription:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "usable_recovery_pack_required",
                "Aucun pack recovery valable avec des seances restantes a cette date.",
            )
        effective_status = self.membership_service.effective_status(subscription, on_date)
        if effective_status not in {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.EXPIRING_SOON,
        }:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "inactive_recovery_pack",
                "Le pack recovery n'est pas actif a cette date.",
            )
        if subscription.remaining_sessions is None or subscription.remaining_sessions <= 0:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "recovery_pack_exhausted",
                "Toutes les seances de ce pack ont deja ete utilisees.",
            )

        subscription.remaining_sessions -= 1
        visit = self.recovery.add_visit(
            RecoveryVisit(
                idempotency_key=data.idempotency_key,
                member_id=member.id,
                subscription_id=subscription.id,
                recorded_by_id=actor.id,
                occurred_at=data.occurred_at,
                sauna_used=RecoveryService.SAUNA in data.services,
                cold_bath_used=RecoveryService.COLD_BATH in data.services,
                compression_used=RecoveryService.COMPRESSION in data.services,
                remaining_sessions_after=subscription.remaining_sessions,
                notes=data.notes.strip() if data.notes and data.notes.strip() else None,
            )
        )
        self.memberships.add_event(
            SubscriptionEvent(
                subscription_id=subscription.id,
                event_type="recovery_session_consumed",
                previous_status=subscription.status,
                new_status=subscription.status,
                details={
                    "visit_id": str(visit.id),
                    "services": sorted(service.value for service in data.services),
                    "remaining_sessions": subscription.remaining_sessions,
                    "occurred_at": data.occurred_at.isoformat(),
                },
                actor_id=actor.id,
            )
        )
        self.audit.record(
            actor=actor,
            action="recovery.visit_recorded",
            entity_type="recovery_visit",
            entity_id=visit.id,
            new_value={
                "member_id": str(member.id),
                "subscription_id": str(subscription.id),
                "remaining_sessions": subscription.remaining_sessions,
                "services": sorted(service.value for service in data.services),
            },
            reason=visit.notes,
        )
        if subscription.remaining_sessions == 0:
            self.notifications.recovery_pack_exhausted(member, subscription)
        return self._visit_read(visit, recorded_by=actor)

    def _member_for_tracking(self, member_id: uuid.UUID, actor: User) -> User:
        member = self.users.get(member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")
        if actor.role in {UserRole.ADMIN, UserRole.RECEPTIONIST}:
            return member
        if actor.role == UserRole.MEMBER and actor.id == member.id:
            return member
        raise api_error(status.HTTP_403_FORBIDDEN, "recovery_tracking_forbidden", "Acces interdit.")

    def _subscription_summary(self, subscription: Subscription) -> RecoverySubscriptionSummary:
        effective = self.membership_service.effective_status(subscription)
        usable = (
            subscription.starts_on <= local_today() <= subscription.ends_on
            and effective in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
            and (subscription.remaining_sessions or 0) > 0
        )
        return RecoverySubscriptionSummary(
            id=subscription.id,
            plan_name=subscription.plan_name,
            starts_on=subscription.starts_on,
            ends_on=subscription.ends_on,
            status=subscription.status,
            effective_status=effective,
            total_sessions=subscription.total_sessions,
            remaining_sessions=subscription.remaining_sessions,
            is_usable=usable,
        )

    def _visit_read(
        self, visit: RecoveryVisit, *, recorded_by: User | None = None
    ) -> RecoveryVisitRead:
        recorded_by = recorded_by or self.users.get(visit.recorded_by_id)
        if not recorded_by:
            raise RuntimeError("Passage recovery incoherent.")
        services: list[RecoveryService] = []
        if visit.sauna_used:
            services.append(RecoveryService.SAUNA)
        if visit.cold_bath_used:
            services.append(RecoveryService.COLD_BATH)
        if visit.compression_used:
            services.append(RecoveryService.COMPRESSION)
        return RecoveryVisitRead(
            id=visit.id,
            member_id=visit.member_id,
            subscription_id=visit.subscription_id,
            recorded_by_id=visit.recorded_by_id,
            recorded_by_name=recorded_by.full_name,
            occurred_at=visit.occurred_at,
            services=services,
            remaining_sessions_after=visit.remaining_sessions_after,
            notes=visit.notes,
            created_at=visit.created_at,
        )
