import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import UserRole


class ClubRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    label: str
    slug: str
    address: str | None
    is_active: bool


class ClubUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    label: str | None = Field(default=None, min_length=2, max_length=80)
    address: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    reason: str = Field(min_length=3, max_length=500)


class UserClubAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    club_id: uuid.UUID
    assigned_by_id: uuid.UUID | None
    created_at: datetime


class UserClubAssignmentsUpdate(BaseModel):
    club_ids: list[uuid.UUID] = Field(max_length=20)
    reason: str = Field(min_length=3, max_length=500)


class MyClubAccessRead(BaseModel):
    user_id: uuid.UUID
    role: UserRole
    clubs: list[ClubRead]
