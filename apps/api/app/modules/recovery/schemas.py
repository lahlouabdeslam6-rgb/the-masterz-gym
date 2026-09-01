import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.shared.enums import RecoveryService, SubscriptionStatus


class RecoveryVisitCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)
    member_id: uuid.UUID
    occurred_at: datetime
    services: set[RecoveryService] = Field(min_length=1, max_length=3)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("occurred_at")
    @classmethod
    def occurred_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at doit inclure un fuseau horaire")
        return value


class RecoveryVisitRead(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    member_id: uuid.UUID
    subscription_id: uuid.UUID
    recorded_by_id: uuid.UUID
    recorded_by_name: str
    occurred_at: datetime
    services: list[RecoveryService]
    remaining_sessions_after: int
    notes: str | None
    created_at: datetime


class RecoverySubscriptionSummary(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    plan_name: str
    starts_on: date
    ends_on: date
    status: SubscriptionStatus
    effective_status: SubscriptionStatus
    total_sessions: int | None
    remaining_sessions: int | None
    is_usable: bool


class RecoveryClientSummary(BaseModel):
    member_id: uuid.UUID
    member_name: str
    member_number: str
    phone: str
    subscription: RecoverySubscriptionSummary


class RecoveryTrackingRead(BaseModel):
    member_id: uuid.UUID
    member_name: str
    member_number: str
    subscriptions: list[RecoverySubscriptionSummary]
    visits: list[RecoveryVisitRead]
