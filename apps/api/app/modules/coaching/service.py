import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.coaching.models import (
    CoachingAssessment,
    CoachingClientProfile,
    CoachMemberAssignment,
)
from app.modules.coaching.repository import CoachingRepository
from app.modules.coaching.schemas import (
    CoachingAssessmentCreate,
    CoachingAssessmentRead,
    CoachingObjectiveRead,
    CoachingObjectiveUpdate,
    CoachingTrackingRead,
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

    def get_tracking(
        self, member_id: uuid.UUID, actor: User, *, limit: int = 100
    ) -> CoachingTrackingRead:
        member = self._member_for_tracking(member_id, actor)
        assignment = self.coaching.active_assignment_for_member(member.id)
        profile = self.coaching.get_profile(member.id)
        objective = None
        if profile:
            updated_by = self.users.get(profile.updated_by_id)
            if not updated_by:
                raise RuntimeError("Profil coaching incoherent.")
            objective = CoachingObjectiveRead(
                objective=profile.objective,
                updated_by_id=profile.updated_by_id,
                updated_by_name=updated_by.full_name,
                updated_at=profile.updated_at,
            )
        coach = self.users.get(assignment.coach_id) if assignment else None
        assessments = [
            self._assessment_read(item)
            for item in self.coaching.list_assessments(member.id, limit=limit)
        ]
        return CoachingTrackingRead(
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            coach_id=assignment.coach_id if assignment else None,
            coach_name=coach.full_name if coach else None,
            objective=objective,
            assessments=assessments,
        )

    def update_objective(
        self,
        member_id: uuid.UUID,
        data: CoachingObjectiveUpdate,
        actor: User,
    ) -> CoachingObjectiveRead:
        member, _ = self._coach_write_context(member_id, actor)
        profile = self.coaching.get_profile(member.id)
        had_objective = profile is not None
        if profile:
            profile.objective = data.objective.strip()
            profile.updated_by_id = actor.id
            self.session.flush()
        else:
            profile = self.coaching.add_profile(
                CoachingClientProfile(
                    member_id=member.id,
                    objective=data.objective.strip(),
                    updated_by_id=actor.id,
                )
            )
        self.audit.record(
            actor=actor,
            action=(
                "coaching.objective_updated" if had_objective else "coaching.objective_created"
            ),
            entity_type="coaching_client_profile",
            entity_id=profile.id,
            previous_value={"objective_defined": had_objective},
            new_value={"objective_defined": True, "member_id": str(member.id)},
            reason="Mise a jour de l'objectif coaching",
        )
        return CoachingObjectiveRead(
            objective=profile.objective,
            updated_by_id=profile.updated_by_id,
            updated_by_name=actor.full_name,
            updated_at=profile.updated_at,
        )

    def create_assessment(
        self,
        member_id: uuid.UUID,
        data: CoachingAssessmentCreate,
        actor: User,
    ) -> CoachingAssessmentRead:
        member, assignment = self._coach_write_context(member_id, actor)
        assessment = self.coaching.add_assessment(
            CoachingAssessment(
                assignment_id=assignment.id,
                member_id=member.id,
                coach_id=actor.id,
                test_type=data.test_type,
                measured_at=data.measured_at,
                metrics=dict(data.metrics),
                notes=data.notes.strip() if data.notes and data.notes.strip() else None,
            )
        )
        self.audit.record(
            actor=actor,
            action="coaching.assessment_recorded",
            entity_type="coaching_assessment",
            entity_id=assessment.id,
            previous_value=None,
            new_value={
                "member_id": str(member.id),
                "test_type": data.test_type.value,
            },
            reason="Nouveau test de progression coaching",
        )
        return self._assessment_read(assessment, coach=actor)

    def _member_for_tracking(self, member_id: uuid.UUID, actor: User) -> User:
        member = self.users.get(member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")
        if actor.role == UserRole.ADMIN:
            return member
        if actor.role == UserRole.MEMBER and actor.id == member.id:
            return member
        if actor.role == UserRole.COACH and self.coaching.active_assignment_for_coach_member(
            actor.id, member.id
        ):
            return member
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "coaching_tracking_forbidden",
            "Vous ne pouvez pas consulter ce suivi coaching.",
        )

    def _coach_write_context(
        self, member_id: uuid.UUID, actor: User
    ) -> tuple[User, CoachMemberAssignment]:
        member = self._member_for_tracking(member_id, actor)
        if actor.role != UserRole.COACH:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "coach_write_required",
                "Seul le coach affecte peut alimenter ce suivi.",
            )
        assignment = self.coaching.active_assignment_for_coach_member(actor.id, member.id)
        if not assignment:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "active_coach_assignment_required",
                "Une affectation active a ce membre est requise.",
            )
        today = local_today()
        subscription = self.memberships.current_subscription(member.id, today, ServiceType.COACHING)
        effective_status = (
            self.membership_service.effective_status(subscription, today) if subscription else None
        )
        if (
            not subscription
            or subscription.starts_on > today
            or effective_status not in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_coaching_subscription_required",
                "Un abonnement coaching actif est requis pour enregistrer le suivi.",
            )
        return member, assignment

    def _assessment_read(
        self, assessment: CoachingAssessment, *, coach: User | None = None
    ) -> CoachingAssessmentRead:
        coach = coach or self.users.get(assessment.coach_id)
        if not coach:
            raise RuntimeError("Test coaching incoherent.")
        return CoachingAssessmentRead(
            id=assessment.id,
            assignment_id=assessment.assignment_id,
            member_id=assessment.member_id,
            coach_id=assessment.coach_id,
            coach_name=coach.full_name,
            test_type=assessment.test_type,
            measured_at=assessment.measured_at,
            metrics=assessment.metrics,
            notes=assessment.notes,
            created_at=assessment.created_at,
        )

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
