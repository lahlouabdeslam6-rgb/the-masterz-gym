import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.shared.enums import AccountStatus, Gender, ServiceType, SubscriptionStatus


class MembershipPlanBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    duration_months: int = Field(ge=1, le=120)
    price: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="MAD", min_length=3, max_length=3)
    service_type: ServiceType = ServiceType.GYM
    session_count: int | None = Field(default=None, ge=1, le=10000)


class MembershipPlanCreate(MembershipPlanBase):
    is_active: bool = True

    @model_validator(mode="after")
    def validate_session_count(self):
        if self.service_type == ServiceType.RECOVERY and self.session_count is None:
            raise ValueError("Le nombre de seances est requis pour une offre recovery.")
        if self.service_type != ServiceType.RECOVERY and self.session_count is not None:
            raise ValueError("Le nombre de seances est reserve aux offres recovery.")
        return self


class MembershipPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    duration_months: int | None = Field(default=None, ge=1, le=120)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    service_type: ServiceType | None = None
    session_count: int | None = Field(default=None, ge=1, le=10000)
    is_active: bool | None = None
    reason: str = Field(min_length=3, max_length=500)


class MembershipPlanRead(MembershipPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    member_id: uuid.UUID
    plan_id: uuid.UUID
    status: SubscriptionStatus
    effective_status: SubscriptionStatus | None = None
    starts_on: date
    ends_on: date
    grace_ends_on: date
    plan_name: str
    duration_months: int
    price: Decimal
    currency: str
    service_type: ServiceType
    total_sessions: int | None
    remaining_sessions: int | None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class MemberSubscriptionSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    email: str | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    account_status: AccountStatus
    member_number: str
    profile_photo_url: str | None = None
    profile_photo_verified_at: datetime | None = None
    created_at: datetime
    subscription_id: uuid.UUID | None = None
    plan_name: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    status: SubscriptionStatus | None = None
    effective_status: SubscriptionStatus | None = None
    days_remaining: int | None = None
    has_active_coaching: bool = False
    has_active_recovery: bool = False


class SubscriptionStatusUpdate(BaseModel):
    status: SubscriptionStatus
    reason: str = Field(min_length=3, max_length=500)


class SubscriptionDatesUpdate(BaseModel):
    starts_on: date
    reason: str = Field(min_length=3, max_length=500)


class SubscriptionEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID
    event_type: str
    previous_status: SubscriptionStatus | None
    new_status: SubscriptionStatus
    details: dict[str, Any]
    actor_id: uuid.UUID
    created_at: datetime


class SettingUpdate(BaseModel):
    value: int = Field(ge=0, le=365)
    reason: str = Field(min_length=3, max_length=500)


class SettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: dict[str, Any]
    updated_at: datetime
