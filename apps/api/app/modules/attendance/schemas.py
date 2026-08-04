import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import AttendanceDecision, SubscriptionStatus


class MemberSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    member_number: str


class AttendanceCreate(BaseModel):
    member_id: uuid.UUID
    exceptional_access_reason: str | None = Field(default=None, min_length=3, max_length=1000)


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    member_id: uuid.UUID
    receptionist_id: uuid.UUID
    subscription_id: uuid.UUID | None
    checked_in_at: datetime
    subscription_status_at_entry: str
    decision: AttendanceDecision
    exceptional_access_reason: str | None
    warning: str | None = None


class AttendanceEligibility(BaseModel):
    subscription_status: SubscriptionStatus | None
    may_enter: bool
    warning: str | None
