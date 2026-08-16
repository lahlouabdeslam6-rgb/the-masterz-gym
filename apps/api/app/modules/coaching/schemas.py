import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import AccountStatus


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
