import uuid
from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.modules.users.schemas import UserRead
from app.shared.phone import normalize_phone


class LoginRequest(BaseModel):
    phone: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class OTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class GenericOTPResponse(BaseModel):
    message: str
    challenge_id: uuid.UUID
    expires_in: int


class PasswordResetConfirm(BaseModel):
    challenge_id: uuid.UUID
    otp: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=10, max_length=128)


class ExistingMemberActivationRequest(BaseModel):
    phone: str
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date | None = None
    member_number: str | None = Field(default=None, max_length=40)

    @field_validator("phone")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        return normalize_phone(value)


class ExistingMemberActivationConfirm(PasswordResetConfirm):
    pass


class MessageResponse(BaseModel):
    message: str
