import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.shared.enums import (
    CollectiveClassReservationStatus,
    CollectiveClassSessionStatus,
)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("La date et l'heure doivent inclure le fuseau horaire.")
    return value


class CollectiveClassTypeCreate(BaseModel):
    club_id: uuid.UUID
    name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    default_duration_minutes: int = Field(ge=15, le=240)
    default_capacity: int = Field(ge=1, le=500)
    is_active: bool = True


class CollectiveClassTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    default_duration_minutes: int | None = Field(default=None, ge=15, le=240)
    default_capacity: int | None = Field(default=None, ge=1, le=500)
    is_active: bool | None = None
    reason: str = Field(min_length=3, max_length=500)


class CollectiveClassTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    description: str | None
    default_duration_minutes: int
    default_capacity: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CollectiveClassSessionCreate(BaseModel):
    club_id: uuid.UUID
    class_type_id: uuid.UUID
    coach_id: uuid.UUID | None = None
    starts_at: datetime
    duration_minutes: int | None = Field(default=None, ge=15, le=240)
    capacity: int | None = Field(default=None, ge=1, le=500)
    note: str | None = Field(default=None, max_length=4000)

    _validate_starts_at = field_validator("starts_at")(_aware)


class CollectiveClassSessionUpdate(BaseModel):
    starts_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=240)
    capacity: int | None = Field(default=None, ge=1, le=500)
    note: str | None = Field(default=None, max_length=4000)
    status: CollectiveClassSessionStatus | None = None
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("starts_at")
    @classmethod
    def validate_optional_starts_at(cls, value: datetime | None) -> datetime | None:
        return _aware(value) if value else value


class CollectiveClassSessionRead(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    class_type_id: uuid.UUID
    class_name: str
    coach_id: uuid.UUID
    coach_name: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    confirmed_count: int
    waitlist_count: int
    available_spots: int
    note: str | None
    status: CollectiveClassSessionStatus
    my_reservation_id: uuid.UUID | None = None
    my_reservation_status: CollectiveClassReservationStatus | None = None
    created_at: datetime


class CollectiveClassReservationCreate(BaseModel):
    session_id: uuid.UUID


class CollectiveClassReservationCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CollectiveClassReservationStatusUpdate(BaseModel):
    status: CollectiveClassReservationStatus
    reason: str = Field(min_length=3, max_length=500)


class CollectiveClassReservationRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    member_id: uuid.UUID
    member_name: str
    member_number: str | None
    class_name: str
    coach_name: str
    starts_at: datetime
    ends_at: datetime
    status: CollectiveClassReservationStatus
    waitlist_position: int | None
    cancellation_reason: str | None
    created_at: datetime
    updated_at: datetime
