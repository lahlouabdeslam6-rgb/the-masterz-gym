import uuid
from datetime import timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.applications.models import MembershipApplication
from app.modules.applications.repository import ApplicationRepository
from app.modules.audit.service import AuditService
from app.modules.memberships.models import Subscription, SubscriptionEvent
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.payments.models import Payment, Receipt
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import MembershipPaymentCreate, PrintableReceiptData
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import AccountStatus, ApplicationStatus, SubscriptionStatus, UserRole
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
            plan = self.memberships.get_plan(application.selected_plan_id)
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

        starts_on = self._resolve_start_date(member, data.starts_on)
        ends_on = add_months(starts_on, plan.duration_months) - timedelta(days=1)
        grace_days = self.membership_service.get_setting_int("subscription_grace_days")
        subscription = self.memberships.add_subscription(
            Subscription(
                member_id=member.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=starts_on,
                ends_on=ends_on,
                grace_ends_on=ends_on + timedelta(days=grace_days),
                plan_name=plan.name,
                duration_months=plan.duration_months,
                price=plan.price,
                currency=plan.currency,
                created_by_id=actor.id,
            )
        )
        self.memberships.add_event(
            SubscriptionEvent(
                subscription_id=subscription.id,
                event_type="created_after_payment",
                previous_status=None,
                new_status=SubscriptionStatus.ACTIVE,
                details={"plan_id": str(plan.id), "starts_on": starts_on.isoformat()},
                actor_id=actor.id,
            )
        )
        payment = self.payments.add_payment(
            Payment(
                idempotency_key=data.idempotency_key,
                member_id=member.id,
                subscription_id=subscription.id,
                amount=plan.price,
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
            application.status = ApplicationStatus.CONVERTED_TO_MEMBER
            application.converted_member_id = member.id
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
                "receipt_number": receipt.receipt_number,
            },
        )
        self.audit.record(
            actor=actor,
            action="subscription.created",
            entity_type="subscription",
            entity_id=subscription.id,
            new_value={
                "status": subscription.status.value,
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

    def _resolve_start_date(self, member: User, requested_start):
        today = local_today()
        current = self.memberships.current_subscription(member.id)
        if not current:
            return requested_start or today
        if today <= current.ends_on:
            return current.ends_on + timedelta(days=1)
        if requested_start is None:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "renewal_start_date_required",
                "La date de début doit être choisie pour un abonnement expiré.",
            )
        return requested_start

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
        return PrintableReceiptData(
            receipt_id=receipt.id,
            receipt_number=receipt.receipt_number,
            issued_at=receipt.issued_at,
            payment_id=payment.id,
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number,
            subscription_id=subscription.id,
            subscription_status=self.membership_service.effective_status(subscription),
            plan_name=subscription.plan_name,
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
