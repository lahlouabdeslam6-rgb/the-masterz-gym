from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.attendance.models import Attendance
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import AttendanceCreate, AttendanceRead
from app.modules.audit.service import AuditService
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import AttendanceDecision, SubscriptionStatus, UserRole
from app.shared.time import local_today


class AttendanceService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.attendances = AttendanceRepository(session)
        self.memberships = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    def check_in(self, data: AttendanceCreate, actor: User) -> AttendanceRead:
        member = self.users.get(data.member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")

        duplicate_minutes = self.membership_service.get_setting_int(
            "attendance_duplicate_window_minutes"
        )
        now = datetime.now(UTC)
        duplicate = self.attendances.recent_accepted(
            member.id, now - timedelta(minutes=duplicate_minutes)
        )
        if duplicate:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "duplicate_attendance",
                "Une présence récente existe déjà pour ce membre.",
                {"attendance_id": str(duplicate.id)},
            )

        subscription = self.memberships.access_subscription(member.id, local_today())
        subscription_status = (
            self.membership_service.synchronize_status(subscription, actor)
            if subscription
            else None
        )
        warning: str | None = None
        if subscription_status in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}:
            decision = AttendanceDecision.ALLOWED
            if subscription_status == SubscriptionStatus.EXPIRING_SOON:
                warning = "L'abonnement expire bientôt."
        elif (
            subscription_status == SubscriptionStatus.EXPIRED
            and subscription
            and subscription.ends_on < local_today() <= subscription.grace_ends_on
        ):
            decision = AttendanceDecision.ALLOWED_WITH_WARNING
            warning = "Le membre est en période de grâce."
        elif data.exceptional_access_reason:
            decision = AttendanceDecision.EXCEPTIONAL_ACCESS
            warning = "Accès exceptionnel accordé."
        else:
            decision = AttendanceDecision.DENIED
            warning = "Accès bloqué : abonnement absent, suspendu, expiré ou annulé."

        attendance = self.attendances.add(
            Attendance(
                member_id=member.id,
                receptionist_id=actor.id,
                subscription_id=subscription.id if subscription else None,
                subscription_status_at_entry=(
                    subscription_status.value if subscription_status else "none"
                ),
                decision=decision,
                exceptional_access_reason=(
                    data.exceptional_access_reason
                    if decision == AttendanceDecision.EXCEPTIONAL_ACCESS
                    else None
                ),
            )
        )
        if decision == AttendanceDecision.EXCEPTIONAL_ACCESS:
            self.audit.record(
                actor=actor,
                action="attendance.exceptional_access",
                entity_type="attendance",
                entity_id=attendance.id,
                new_value={
                    "member_id": str(member.id),
                    "subscription_status": attendance.subscription_status_at_entry,
                },
                reason=data.exceptional_access_reason,
            )
        return AttendanceRead.model_validate(attendance).model_copy(update={"warning": warning})
