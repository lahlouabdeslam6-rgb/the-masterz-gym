import uuid

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modules.payments.models import Payment, Receipt


class PaymentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def lock_idempotency_key(self, key: str) -> None:
        self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": key}
        )

    def by_idempotency_key(self, key: str) -> Payment | None:
        return self.session.scalar(select(Payment).where(Payment.idempotency_key == key))

    def add_payment(self, payment: Payment) -> Payment:
        self.session.add(payment)
        self.session.flush()
        return payment

    def get_payment(self, payment_id: uuid.UUID) -> Payment | None:
        return self.session.get(Payment, payment_id)

    def add_receipt(self, receipt: Receipt) -> Receipt:
        self.session.add(receipt)
        self.session.flush()
        return receipt

    def receipt_by_payment(self, payment_id: uuid.UUID) -> Receipt | None:
        return self.session.scalar(select(Receipt).where(Receipt.payment_id == payment_id))

    def get_receipt(self, receipt_id: uuid.UUID) -> Receipt | None:
        return self.session.get(Receipt, receipt_id)

    def list_member_receipts(self, member_id: uuid.UUID) -> list[Receipt]:
        return list(
            self.session.scalars(
                select(Receipt)
                .join(Payment, Payment.id == Receipt.payment_id)
                .where(Payment.member_id == member_id)
                .order_by(Receipt.issued_at.desc())
            )
        )
