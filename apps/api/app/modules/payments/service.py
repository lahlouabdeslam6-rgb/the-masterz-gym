import uuid
from datetime import timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.applications.models import MembershipApplication
from app.modules.applications.repository import ApplicationRepository
from app.modules.audit.service import AuditService
from app.modules.clubs.repository import ClubRepository
from app.modules.clubs.service import ClubService
from app.modules.memberships.models import Subscription, SubscriptionEvent
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.payments.models import Payment, Receipt
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import MembershipPaymentCreate, PrintableReceiptData
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import (
    AccountStatus,
    ApplicationStatus,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import add_months, local_today


class PaymentService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.payments = PaymentRepository(session)
        self.memberships = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.applications = ApplicationRepository(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)
        self.clubs = ClubRepository(session)

    def record_membership_payment(
        self, data: MembershipPaymentCreate, actor: User
    ) -> PrintableReceiptData:
        self.payments.lock_idempotency_key(data.idempotency_key)
        existing = self.payments.by_idempotency_key(data.idempotency_key)
        if existing:
            receipt = self.payments.receipt_by_payment(existing.id)
            if not receipt:
                raise RuntimeError("Paiement idempotent sans reçu.")
            return self.printable_receipt(receipt.id)

        application: MembershipApplication | None = None
        application_plan_changed = False
        if data.application_id:
            application = self.applications.get(data.application_id)
            if not application:
                raise api_error(
                    status.HTTP_404_NOT_FOUND,
                    "application_not_found",
                    "Demande introuvable.",
                )
            if application.status != ApplicationStatus.APPROVED:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "application_not_approved",
                    "La demande doit être approuvée avant paiement.",
                )
            original_plan_id = application.selected_plan_id
            final_plan_id = data.plan_id or original_plan_id
            plan = self.memberships.get_plan(final_plan_id)
            application_plan_changed = final_plan_id != original_plan_id
            member = self._member_from_application(application)
        else:
            member = self.users.get(data.member_id) if data.member_id else None
            plan = self.memberships.get_plan(data.plan_id) if data.plan_id else None
            if not member or member.role != UserRole.MEMBER:
                raise api_error(
                    status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable."
                )
        if not plan or not plan.is_active:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "inactive_plan",
                "La formule n'est pas disponible.",
            )
        ClubService(self.session).require_access(actor, plan.club_id)
        session_services = {ServiceType.RECOVERY, ServiceType.MARTIAL_ARTS}
        if plan.service_type in session_services and plan.session_count is None:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "session_plan_not_configured",
                "Le nombre de seances de cette offre doit etre configure.",
            )

        charged_price = (
            application.promotion_price
            if application
            and not application_plan_changed
            and application.promotion_price is not None
            else plan.price
        )
        charged_plan_name = (
            f"{plan.name} · {application.promotion_title}"
            if application and not application_plan_changed and application.promotion_title
            else plan.name
        )

        starts_on = self._resolve_start_date(
            member, data.starts_on, plan.service_type, plan.club_id
        )
        ends_on = add_months(starts_on, plan.duration_months) - timedelta(days=1)
        grace_days = self.membership_service.get_setting_int("subscription_grace_days")
        subscription = self.memberships.add_subscription(
            Subscription(
                club_id=plan.club_id,
                member_id=member.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=starts_on,
                ends_on=ends_on,
                grace_ends_on=ends_on + timedelta(days=grace_days),
                plan_name=charged_plan_name,
                duration_months=plan.duration_months,
                price=charged_price,
                currency=plan.currency,
                service_type=plan.service_type,
                total_sessions=(
                    plan.session_count if plan.service_type in session_services else None
                ),
                remaining_sessions=(
                    plan.session_count if plan.service_type in session_services else None
                ),
                created_by_id=actor.id,
            )
        )
        self.memberships.add_event(
            SubscriptionEvent(
                subscription_id=subscription.id,
                event_type="created_after_payment",
                previous_status=None,
                new_status=SubscriptionStatus.ACTIVE,
                details={
                    "plan_id": str(plan.id),
                    "service_type": plan.service_type.value,
                    "starts_on": starts_on.isoformat(),
                },
                actor_id=actor.id,
            )
        )
        payment = self.payments.add_payment(
            Payment(
                club_id=plan.club_id,
                idempotency_key=data.idempotency_key,
                member_id=member.id,
                subscription_id=subscription.id,
                amount=charged_price,
                currency=plan.currency,
                method=data.method,
                bank_transfer_reference=data.bank_transfer_reference,
                recorded_by_id=actor.id,
            )
        )
        receipt = self.payments.add_receipt(
            Receipt(
                receipt_number=f"TMG-{local_today():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}",
                payment_id=payment.id,
            )
        )
        if application:
            if application_plan_changed:
                application.selected_plan_id = plan.id
                application.club_id = plan.club_id
                application.promotion_id = None
                application.promotion_title = None
                application.promotion_price = None
                application.promotion_currency = None
                application.promotion_participant_count = None
            application.status = ApplicationStatus.CONVERTED_TO_MEMBER
            application.converted_member_id = member.id
        self.clubs.ensure_assignment(member.id, plan.club_id, actor.id)
        self.session.flush()

        self.audit.record(
            actor=actor,
            action="payment.recorded",
            entity_type="payment",
            entity_id=payment.id,
            new_value={
                "amount": str(payment.amount),
                "currency": payment.currency,
                "method": payment.method.value,
                "subscription_id": str(subscription.id),
                "service_type": subscription.service_type.value,
                "receipt_number": receipt.receipt_number,
                "promotion_id": (
                    str(application.promotion_id)
                    if application and application.promotion_id
                    else None
                ),
                "promotion_title": (application.promotion_title if application else None),
            },
        )
        self.audit.record(
            actor=actor,
            action="subscription.created",
            entity_type="subscription",
            entity_id=subscription.id,
            new_value={
                "status": subscription.status.value,
                "service_type": subscription.service_type.value,
                "starts_on": subscription.starts_on.isoformat(),
                "ends_on": subscription.ends_on.isoformat(),
            },
        )
        if application:
            self.audit.record(
                actor=actor,
                action="application.converted_to_member",
                entity_type="membership_application",
                entity_id=application.id,
                previous_value={"status": ApplicationStatus.APPROVED.value},
                new_value={
                    "status": ApplicationStatus.CONVERTED_TO_MEMBER.value,
                    "member_id": str(member.id),
                    "plan_id": str(plan.id),
                    "plan_name": plan.name,
                },
            )
        return self.printable_receipt(receipt.id)

    def _member_from_application(self, application: MembershipApplication) -> User:
        member = self.users.by_phone(application.phone)
        if member:
            if member.role != UserRole.MEMBER:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "phone_already_used",
                    "Ce numéro est associé à un autre type de compte.",
                )
            return member
        member = User(
            full_name=application.full_name,
            phone=application.phone,
            email=application.email,
            date_of_birth=application.date_of_birth,
            gender=application.gender,
            password_hash=None,
            role=UserRole.MEMBER,
            status=AccountStatus.PENDING_ACTIVATION,
            member_number=f"TMG-{local_today():%Y}-{uuid.uuid4().hex[:8].upper()}",
        )
        self.users.add(member)
        return member

    def _resolve_start_date(
        self,
        member: User,
        requested_start,
        service_type: ServiceType,
        club_id: uuid.UUID,
    ):
        today = local_today()
        current = self.memberships.current_subscription(member.id, today, service_type, club_id)
        if not current:
            return requested_start or today
        current_status = self.membership_service.effective_status(current, today)
        session_services = {ServiceType.RECOVERY, ServiceType.MARTIAL_ARTS}
        if current_status not in {
            SubscriptionStatus.SUSPENDED,
            SubscriptionStatus.EXPIRED,
            SubscriptionStatus.CANCELLED,
        } and not (service_type in session_services and current.remaining_sessions == 0):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_subscription",
                "Un abonnement de cette categorie est encore valide pour ce membre.",
            )
        return requested_start or today

    def printable_receipt(self, receipt_id: uuid.UUID) -> PrintableReceiptData:
        receipt = self.payments.get_receipt(receipt_id)
        if not receipt:
            raise api_error(status.HTTP_404_NOT_FOUND, "receipt_not_found", "Reçu introuvable.")
        payment = self.payments.get_payment(receipt.payment_id)
        if not payment:
            raise RuntimeError("Reçu sans paiement.")
        subscription = self.memberships.get_subscription(payment.subscription_id)
        member = self.users.get(payment.member_id)
        employee = self.users.get(payment.recorded_by_id)
        if not subscription or not member or not employee or not member.member_number:
            raise RuntimeError("Données de reçu incomplètes.")
        club = self.clubs.get(payment.club_id)
        if not club:
            raise RuntimeError("Salle du paiement introuvable.")
        return PrintableReceiptData(
            receipt_id=receipt.id,
            club_id=club.id,
            club_label=club.label,
            receipt_number=receipt.receipt_number,
            issued_at=receipt.issued_at,
            payment_id=payment.id,
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number,
            subscription_id=subscription.id,
            subscription_status=self.membership_service.effective_status(subscription),
            plan_name=subscription.plan_name,
            service_type=subscription.service_type,
            total_sessions=subscription.total_sessions,
            remaining_sessions=subscription.remaining_sessions,
            starts_on=subscription.starts_on,
            ends_on=subscription.ends_on,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.method,
            bank_transfer_reference=payment.bank_transfer_reference,
            recorded_by_id=employee.id,
            recorded_by_name=employee.full_name,
            paid_at=payment.paid_at,
        )
