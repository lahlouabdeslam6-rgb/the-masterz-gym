import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.coaching.models import CoachMemberAssignment
from app.modules.coaching.repository import CoachingRepository
from app.modules.coaching.schemas import (
    CoachMemberAssignmentCreate,
    CoachMemberAssignmentEnd,
    CoachMemberAssignmentRead,
    CoachSummary,
)
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import (
    AccountStatus,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import local_today


class CoachingService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.coaching = CoachingRepository(session)
        self.users = UserRepository(session)
        self.memberships = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.audit = AuditService(session)

    def list_coaches(self) -> list[CoachSummary]:
        return [
            CoachSummary(
                id=coach.id,
                full_name=coach.full_name,
                phone=coach.phone,
                email=coach.email,
                status=coach.status,
                active_member_count=self.coaching.active_member_count(coach.id),
            )
            for coach in self.coaching.list_coaches()
        ]

    def list_assignments(
        self,
        *,
        active_only: bool = True,
        coach_id: uuid.UUID | None = None,
        member_id: uuid.UUID | None = None,
    ) -> list[CoachMemberAssignmentRead]:
        return [
            self._assignment_read(item)
            for item in self.coaching.list_assignments(
                active_only=active_only,
                coach_id=coach_id,
                member_id=member_id,
            )
        ]

    def assign_member(
        self, data: CoachMemberAssignmentCreate, actor: User
    ) -> CoachMemberAssignmentRead:
        coach = self.users.get(data.coach_id)
        if not coach or coach.role != UserRole.COACH:
            raise api_error(status.HTTP_404_NOT_FOUND, "coach_not_found", "Coach introuvable.")
        if coach.status != AccountStatus.ACTIVE:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coach_inactive",
                "Ce coach ne peut pas recevoir de nouveaux clients.",
            )
        member = self.users.get(data.member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")

        now = datetime.now(UTC)
        previous = self.coaching.active_assignment_for_member(member.id, for_update=True)
        if previous and previous.coach_id == coach.id:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_already_assigned",
                "Ce membre est deja affecte a ce coach.",
            )

        today = local_today()
        coaching_subscription = self.memberships.current_subscription(
            member.id, today, ServiceType.COACHING
        )
        coaching_status = (
            self.membership_service.effective_status(coaching_subscription, today)
            if coaching_subscription
            else None
        )
        if (
            not coaching_subscription
            or coaching_subscription.starts_on > today
            or coaching_status not in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_coaching_subscription_required",
                "Un abonnement coaching actif est requis avant l'affectation.",
            )
        previous_value = None
        if previous:
            previous.ended_at = now
            previous_value = {
                "assignment_id": str(previous.id),
                "coach_id": str(previous.coach_id),
            }
            self.session.flush()

        assignment = CoachMemberAssignment(
            coach_id=coach.id,
            member_id=member.id,
            assigned_by_id=actor.id,
            started_at=now,
            ended_at=None,
            reason=data.reason,
        )
        try:
            self.coaching.add_assignment(assignment)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_assignment_conflict",
                "L'affectation du membre a change. Rechargez la page.",
            ) from exc

        self.audit.record(
            actor=actor,
            action=("coaching.member_reassigned" if previous_value else "coaching.member_assigned"),
            entity_type="coach_member_assignment",
            entity_id=assignment.id,
            previous_value=previous_value,
            new_value={
                "coach_id": str(coach.id),
                "member_id": str(member.id),
            },
            reason=data.reason,
        )
        return self._assignment_read(assignment, coach=coach, member=member)

    def end_assignment(
        self,
        assignment_id: uuid.UUID,
        data: CoachMemberAssignmentEnd,
        actor: User,
    ) -> CoachMemberAssignmentRead:
        assignment = self.coaching.get_assignment(assignment_id)
        if not assignment:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "assignment_not_found",
                "Affectation introuvable.",
            )
        if assignment.ended_at:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "assignment_already_ended",
                "Cette affectation est deja terminee.",
            )
        assignment.ended_at = datetime.now(UTC)
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="coaching.assignment_ended",
            entity_type="coach_member_assignment",
            entity_id=assignment.id,
            previous_value={"ended_at": None},
            new_value={"ended_at": assignment.ended_at.isoformat()},
            reason=data.reason,
        )
        return self._assignment_read(assignment)

    def _assignment_read(
        self,
        assignment: CoachMemberAssignment,
        *,
        coach: User | None = None,
        member: User | None = None,
    ) -> CoachMemberAssignmentRead:
        coach = coach or self.users.get(assignment.coach_id)
        member = member or self.users.get(assignment.member_id)
        if not coach or not member:
            raise RuntimeError("Affectation coaching incoherente.")
        return CoachMemberAssignmentRead(
            id=assignment.id,
            coach_id=assignment.coach_id,
            coach_name=coach.full_name,
            member_id=assignment.member_id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            assigned_by_id=assignment.assigned_by_id,
            started_at=assignment.started_at,
            ended_at=assignment.ended_at,
            reason=assignment.reason,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
