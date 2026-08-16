import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.core.errors import api_error
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import MembershipPaymentCreate, PrintableReceiptData
from app.modules.payments.service import PaymentService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/payments", tags=["Payments and receipts"])
Reception = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.post(
    "/memberships", response_model=PrintableReceiptData, status_code=status.HTTP_201_CREATED
)
def record_membership_payment(data: MembershipPaymentCreate, session: DbSession, actor: Reception):
    return PaymentService(session).record_membership_payment(data, actor)


@router.get("/receipts/{receipt_id}", response_model=PrintableReceiptData)
def get_printable_receipt(receipt_id: uuid.UUID, session: DbSession, actor: CurrentUser):
    receipt = PaymentRepository(session).get_receipt(receipt_id)
    if not receipt:
        raise api_error(404, "receipt_not_found", "Reçu introuvable.")
    payment = PaymentRepository(session).get_payment(receipt.payment_id)
    if not payment:
        raise api_error(404, "receipt_not_found", "Reçu introuvable.")
    if actor.role not in {UserRole.ADMIN, UserRole.RECEPTIONIST} and payment.member_id != actor.id:
        raise api_error(403, "permission_denied", "Accès interdit.")
    return PaymentService(session).printable_receipt(receipt_id)


@router.get("/members/{member_id}/receipts", response_model=list[PrintableReceiptData])
def list_member_receipts(member_id: uuid.UUID, session: DbSession, actor: CurrentUser):
    if actor.role not in {UserRole.ADMIN, UserRole.RECEPTIONIST} and actor.id != member_id:
        raise api_error(403, "permission_denied", "Accès interdit.")
    repository = PaymentRepository(session)
    service = PaymentService(session)
    return [
        service.printable_receipt(receipt.id)
        for receipt in repository.list_member_receipts(member_id)
    ]
