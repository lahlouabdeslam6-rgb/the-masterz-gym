import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.shared.enums import ApplicationStatus, Gender
from app.shared.phone import normalize_phone


class ApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str
    email: EmailStr | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    selected_plan_id: uuid.UUID
    promotion_id: uuid.UUID | None = None
    fitness_objective: str | None = Field(default=None, max_length=500)
    message: str | None = Field(default=None, max_length=2000)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class ApplicationReview(BaseModel):
    status: ApplicationStatus
    reason: str | None = Field(default=None, max_length=2000)


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    email: EmailStr | None
    date_of_birth: date | None
    gender: Gender | None
    selected_plan_id: uuid.UUID
    promotion_id: uuid.UUID | None
    promotion_title: str | None
    promotion_price: Decimal | None
    promotion_currency: str | None
    promotion_participant_count: int | None
    fitness_objective: str | None
    message: str | None
    status: ApplicationStatus
    review_reason: str | None
    reviewed_by_id: uuid.UUID | None
    converted_member_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
