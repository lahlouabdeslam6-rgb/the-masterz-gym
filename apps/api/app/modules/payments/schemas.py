import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.shared.enums import PaymentMethod, ServiceType, SubscriptionStatus


class MembershipPaymentCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)
    application_id: uuid.UUID | None = None
    member_id: uuid.UUID | None = None
    plan_id: uuid.UUID | None = None
    starts_on: date | None = None
    method: PaymentMethod
    bank_transfer_reference: str | None = Field(default=None, max_length=160)

    @model_validator(mode="after")
    def validate_target_and_method(self):
        if (self.application_id is None) == (self.member_id is None):
            raise ValueError("Fournir soit application_id, soit member_id.")
        if self.member_id is not None and self.plan_id is None:
            raise ValueError("plan_id est requis pour un membre existant.")
        if self.method == PaymentMethod.BANK_TRANSFER and not self.bank_transfer_reference:
            raise ValueError("La référence bancaire est requise pour un virement.")
        return self


class PrintableReceiptData(BaseModel):
    receipt_id: uuid.UUID
    receipt_number: str
    issued_at: datetime
    payment_id: uuid.UUID
    member_id: uuid.UUID
    member_name: str
    member_number: str
    subscription_id: uuid.UUID
    subscription_status: SubscriptionStatus
    plan_name: str
    service_type: ServiceType
    starts_on: date
    ends_on: date
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    bank_transfer_reference: str | None
    recorded_by_id: uuid.UUID
    recorded_by_name: str
    paid_at: datetime
