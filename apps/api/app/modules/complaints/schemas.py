import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import ComplaintCategory, ComplaintStatus, UserRole


class ComplaintCreate(BaseModel):
    category: ComplaintCategory
    subject: str = Field(min_length=3, max_length=180)
    message: str = Field(min_length=3, max_length=4000)


class ComplaintMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus


class ComplaintMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_id: uuid.UUID | None
    author_name: str
    author_role: UserRole
    body: str
    created_at: datetime


class ComplaintRead(BaseModel):
    id: uuid.UUID
    member_id: uuid.UUID
    member_name: str
    member_number: str
    category: ComplaintCategory
    assigned_role: UserRole
    subject: str
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    messages: list[ComplaintMessageRead]
