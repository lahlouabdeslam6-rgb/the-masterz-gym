import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.shared.enums import AccountStatus, CoachingTestType

MetricValue = str | int | float | bool | None


class CoachSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    email: EmailStr | None
    status: AccountStatus
    active_member_count: int


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
