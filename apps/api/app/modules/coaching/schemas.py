import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.modules.clubs.constants import SALLE_1_ID
from app.shared.enums import (
    AccountStatus,
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    CoachingTestType,
)

MetricValue = str | int | float | bool | None


class CoachSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    email: EmailStr | None
    status: AccountStatus
    active_member_count: int


class CoachDirectoryRead(BaseModel):
    id: uuid.UUID
    full_name: str
    status: AccountStatus
    active_member_count: int


class CoachingAssignmentRequestCreate(BaseModel):
    preferred_coach_id: uuid.UUID | None = None
    member_note: str | None = Field(default=None, max_length=1000)


class CoachingAssignmentRequestDecision(BaseModel):
    status: CoachingAssignmentRequestStatus
    coach_id: uuid.UUID | None = None
    decision_note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def decision_must_be_final(self):
        if self.status == CoachingAssignmentRequestStatus.PENDING:
            raise ValueError("La decision doit approuver ou refuser la demande")
        if (
            self.status == CoachingAssignmentRequestStatus.REJECTED
            and len((self.decision_note or "").strip()) < 3
        ):
            raise ValueError("Un motif est requis pour refuser la demande")
        return self


class CoachingAssignmentRequestRead(BaseModel):
    id: uuid.UUID
    member_id: uuid.UUID
    member_name: str
    member_number: str
    preferred_coach_id: uuid.UUID | None
    preferred_coach_name: str | None
    assigned_coach_id: uuid.UUID | None
    assigned_coach_name: str | None
    status: CoachingAssignmentRequestStatus
    member_note: str | None
    decision_note: str | None
    decided_by_id: uuid.UUID | None
    decided_by_name: str | None
    decided_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CoachMemberAssignmentCreate(BaseModel):
    coach_id: uuid.UUID
    member_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=500)


class CoachMemberAssignmentEnd(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CoachMemberAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    coach_id: uuid.UUID
    coach_name: str
    member_id: uuid.UUID
    member_name: str
    member_number: str
    member_profile_photo_url: str | None
    member_profile_photo_verified_at: datetime | None
    assigned_by_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    reason: str
    created_at: datetime
    updated_at: datetime


class CoachingObjectiveUpdate(BaseModel):
    objective: str = Field(min_length=3, max_length=2000)


class CoachingObjectiveRead(BaseModel):
    objective: str
    updated_by_id: uuid.UUID
    updated_by_name: str
    updated_at: datetime


class CoachingAssessmentCreate(BaseModel):
    test_type: CoachingTestType
    measured_at: datetime
    metrics: dict[str, MetricValue] = Field(min_length=1, max_length=40)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("measured_at")
    @classmethod
    def measured_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("measured_at doit inclure un fuseau horaire")
        return value


class CoachingAssessmentRead(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    member_id: uuid.UUID
    coach_id: uuid.UUID
    coach_name: str
    test_type: CoachingTestType
    measured_at: datetime
    metrics: dict[str, MetricValue]
    notes: str | None
    created_at: datetime


class CoachingTrackingRead(BaseModel):
    member_id: uuid.UUID
    member_name: str
    member_number: str
    coach_id: uuid.UUID | None
    coach_name: str | None
    objective: CoachingObjectiveRead | None
    assessments: list[CoachingAssessmentRead]


def _validate_aware_datetime(value: datetime, field_name: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field_name} doit inclure un fuseau horaire")
    return value


class CoachAvailabilityCreate(BaseModel):
    club_id: uuid.UUID = SALLE_1_ID
    starts_at: datetime
    ends_at: datetime
    session_duration_minutes: int = Field(ge=15, le=240)
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def dates_must_be_timezone_aware(cls, value: datetime, info) -> datetime:
        return _validate_aware_datetime(value, info.field_name)

    @model_validator(mode="after")
    def period_must_be_valid(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at doit etre posterieur a starts_at")
        return self


class CoachAvailabilityUpdate(CoachAvailabilityCreate):
    is_active: bool


class CoachingReservedPeriod(BaseModel):
    starts_at: datetime
    ends_at: datetime


class CoachAvailabilityRead(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    coach_id: uuid.UUID
    coach_name: str
    starts_at: datetime
    ends_at: datetime
    session_duration_minutes: int
    note: str | None
    is_active: bool
    requested_booking_count: int
    confirmed_booking_count: int
    created_at: datetime
    updated_at: datetime
    reserved_periods: list[CoachingReservedPeriod]


class CoachingBookingCreate(BaseModel):
    availability_id: uuid.UUID
    starts_at: datetime
    member_note: str | None = Field(default=None, max_length=1000)

    @field_validator("starts_at")
    @classmethod
    def starts_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        return _validate_aware_datetime(value, "starts_at")


class CoachingBookingStatusUpdate(BaseModel):
    status: CoachingBookingStatus
    decision_note: str | None = Field(default=None, max_length=1000)
    confirm_overlap: bool = False


class CoachingBookingReschedule(BaseModel):
    availability_id: uuid.UUID
    starts_at: datetime
    decision_note: str | None = Field(default=None, max_length=1000)
    confirm_overlap: bool = False

    @field_validator("starts_at")
    @classmethod
    def starts_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        return _validate_aware_datetime(value, "starts_at")


class CoachingBookingRead(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    availability_id: uuid.UUID
    assignment_id: uuid.UUID
    coach_id: uuid.UUID
    coach_name: str
    member_id: uuid.UUID
    member_name: str
    member_number: str
    starts_at: datetime
    ends_at: datetime
    status: CoachingBookingStatus
    member_note: str | None
    decision_note: str | None
    decided_by_id: uuid.UUID | None
    decided_by_name: str | None
    decided_at: datetime | None
    conflict_override: bool
    overlapping_confirmed_count: int
    created_at: datetime
    updated_at: datetime


class CoachingMessageRead(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_role: str
    body: str | None
    media_url: str | None
    media_type: str | None
    created_at: datetime


class CoachingConversationRead(BaseModel):
    assignment_id: uuid.UUID
    coach_id: uuid.UUID
    coach_name: str
    member_id: uuid.UUID
    member_name: str
    member_number: str
    is_active: bool
    last_message: CoachingMessageRead | None
