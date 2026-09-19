import uuid
from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.applications.models import MembershipApplication
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import ApplicationCreate, ApplicationReview
from app.modules.audit.service import AuditService
from app.modules.clubs.service import ClubService
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.promotions.service import PromotionService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import (
    ApplicationStatus,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import local_today

REVIEWABLE_STATUSES = {
    ApplicationStatus.PENDING,
    ApplicationStatus.MORE_INFORMATION_REQUIRED,
    ApplicationStatus.APPROVED,
}


class ApplicationService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.applications = ApplicationRepository(session)
        self.plans = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    def list(
        self,
        actor: User,
        application_status: ApplicationStatus | None = None,
        club_id: uuid.UUID | None = None,
    ) -> list[MembershipApplication]:
        self.purge_stale_pending()
        clubs = ClubService(self.session)
        if club_id:
            clubs.require_access(actor, club_id)
            return self.applications.list(application_status, club_id)
        if actor.role == UserRole.ADMIN:
            return self.applications.list(application_status)
        allowed_club_ids = [club.id for club in clubs.clubs_for(actor)]
        return self.applications.list(
            application_status,
            club_ids=allowed_club_ids,
        )

    def get(self, application_id: uuid.UUID) -> MembershipApplication | None:
        self.purge_stale_pending()
        return self.applications.get(application_id)

    def get_for_actor(self, application_id: uuid.UUID, actor: User) -> MembershipApplication | None:
        application = self.get(application_id)
        if application:
            ClubService(self.session).require_access(actor, application.club_id)
        return application

    def purge_stale_pending(self) -> int:
        retention_days = self.membership_service.get_setting_int(
            "application_pending_retention_days"
        )
        cutoff = datetime.now(UTC) - timedelta(days=retention_days)
        stale_applications = self.applications.stale_pending(cutoff)
        for application in stale_applications:
            self.audit.record(
                actor=None,
                action="application.auto_deleted",
                entity_type="membership_application",
                entity_id=application.id,
                previous_value={
                    "status": application.status.value,
                    "applicant_name": application.full_name,
                    "phone": application.phone,
                    "created_at": application.created_at.isoformat(),
                },
                reason=(f"Demande pending sans traitement depuis {retention_days} jour(s)"),
            )
            self.applications.delete(application)
        if stale_applications:
            self.session.flush()
        return len(stale_applications)

    def submit(self, data: ApplicationCreate) -> MembershipApplication:
        plan = self.plans.get_plan(data.selected_plan_id)
        if not plan or not plan.is_active:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "inactive_plan",
                "La formule selectionnee n'est pas disponible.",
            )
        existing_member = self.users.by_phone(data.phone)
        if existing_member and existing_member.role == UserRole.MEMBER:
            current = self.plans.current_subscription(
                existing_member.id,
                local_today(),
                plan.service_type,
                plan.club_id,
            )
            session_services = {ServiceType.RECOVERY, ServiceType.MARTIAL_ARTS}
            if (
                current
                and not (
                    current.service_type in session_services and current.remaining_sessions == 0
                )
                and self.membership_service.effective_status(current)
                not in {
                    SubscriptionStatus.SUSPENDED,
                    SubscriptionStatus.EXPIRED,
                    SubscriptionStatus.CANCELLED,
                }
            ):
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "active_subscription",
                    (
                        "Ce membre a deja paye un abonnement encore valide dans cette "
                        "categorie et cette salle."
                    ),
                )
        promotion = None
        if data.promotion_id:
            promotion = PromotionService(self.session).available_for_application(data.promotion_id)
            if promotion.base_plan_id != plan.id:
                raise api_error(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "promotion_plan_mismatch",
                    "Cette offre ne correspond pas a la formule choisie.",
                )
        application = self.applications.add(
            MembershipApplication(
                **data.model_dump(exclude={"promotion_id"}),
                club_id=plan.club_id,
                promotion_id=promotion.id if promotion else None,
                promotion_title=promotion.title if promotion else None,
                promotion_price=promotion.price if promotion else None,
                promotion_currency=promotion.currency if promotion else None,
                promotion_participant_count=(promotion.participant_count if promotion else None),
            )
        )
        self.audit.record(
            actor=None,
            action="application.submitted",
            entity_type="membership_application",
            entity_id=application.id,
            new_value={
                "applicant_name": application.full_name,
                "club_id": str(application.club_id),
                "plan_name": plan.name,
                "service_type": plan.service_type.value,
                "promotion_title": promotion.title if promotion else None,
                "status": application.status.value,
            },
            reason="Nouvelle demande d'inscription",
        )
        return application

    def review(
        self, application_id: uuid.UUID, data: ApplicationReview, actor: User
    ) -> MembershipApplication:
        application = self.get_for_actor(application_id, actor)
        if not application:
            raise api_error(
                status.HTTP_404_NOT_FOUND, "application_not_found", "Demande introuvable."
            )
        if application.status not in REVIEWABLE_STATUSES:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "application_not_reviewable",
                "Cette demande ne peut plus être révisée.",
            )
        if data.status not in {
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.MORE_INFORMATION_REQUIRED,
        }:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "invalid_application_transition",
                "Transition de demande invalide.",
            )
        if (
            data.status
            in {
                ApplicationStatus.REJECTED,
                ApplicationStatus.MORE_INFORMATION_REQUIRED,
            }
            and not data.reason
        ):
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "review_reason_required",
                "Un motif est requis.",
            )
        previous = application.status
        application.status = data.status
        application.review_reason = data.reason
        application.reviewed_by_id = actor.id
        self.session.flush()
        self.audit.record(
            actor=actor,
            action=f"application.{data.status.value}",
            entity_type="membership_application",
            entity_id=application.id,
            previous_value={"status": previous.value},
            new_value={"status": data.status.value},
            reason=data.reason,
        )
        return application
