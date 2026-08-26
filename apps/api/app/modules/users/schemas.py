import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.shared.enums import AccountStatus, Gender, UserRole
from app.shared.phone import normalize_phone


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    email: EmailStr | None
    date_of_birth: date | None
    gender: Gender | None
    role: UserRole
    status: AccountStatus
    member_number: str | None
    profile_photo_url: str | None
    profile_photo_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str
    email: EmailStr | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    password: str = Field(min_length=10, max_length=128)
    role: UserRole
    status: AccountStatus = AccountStatus.ACTIVE
    member_number: str | None = Field(default=None, max_length=40)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class UserUpdateRoleStatus(BaseModel):
    role: UserRole | None = None
    status: AccountStatus | None = None
    reason: str = Field(min_length=3, max_length=500)


class UserAdminUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=10, max_length=128)
    role: UserRole
    status: AccountStatus
    member_number: str | None = Field(default=None, max_length=40)
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class MemberProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str
    email: EmailStr | None = None
    date_of_birth: date | None = None
    gender: Gender | None = None
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)
