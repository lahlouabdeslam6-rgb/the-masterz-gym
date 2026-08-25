import uuid

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.applications.models import MembershipApplication
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import ApplicationCreate, ApplicationReview
from app.modules.audit.service import AuditService
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

    def submit(self, data: ApplicationCreate) -> MembershipApplication:
        plan = self.plans.get_plan(data.selected_plan_id)
        if not plan or not plan.is_active or plan.service_type != ServiceType.GYM:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "inactive_plan",
                "La formule salle sélectionnée n'est pas disponible.",
            )
        existing_member = self.users.by_phone(data.phone)
        if existing_member and existing_member.role == UserRole.MEMBER:
            current = self.plans.current_subscription(
                existing_member.id,
                local_today(),
                ServiceType.GYM,
            )
            if current and self.membership_service.effective_status(current) not in {
                SubscriptionStatus.SUSPENDED,
                SubscriptionStatus.EXPIRED,
                SubscriptionStatus.CANCELLED,
            }:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "active_subscription",
                    "Ce membre a deja paye un abonnement salle encore valide.",
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
                "plan_name": plan.name,
                "promotion_title": promotion.title if promotion else None,
                "status": application.status.value,
            },
            reason="Nouvelle demande d'inscription",
        )
        return application

    def review(
        self, application_id: uuid.UUID, data: ApplicationReview, actor: User
    ) -> MembershipApplication:
        application = self.applications.get(application_id)
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
