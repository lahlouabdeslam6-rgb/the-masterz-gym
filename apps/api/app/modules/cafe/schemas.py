import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.clubs.constants import SALLE_1_ID


class CafeMenuItemCreate(BaseModel):
    club_id: uuid.UUID = SALLE_1_ID
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    media_urls: list[str] = Field(default_factory=list, max_length=12)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="MAD", min_length=3, max_length=3)
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("name", "category", mode="before")
    @classmethod
    def normalize_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("description", "image_url", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if not isinstance(value, str):
            return value
        return value.strip() or None

    @field_validator("media_urls")
    @classmethod
    def validate_media_urls(cls, value: list[str]) -> list[str]:
        return _normalize_media_urls(value)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value):
        return value.strip().upper() if isinstance(value, str) else value


class CafeMenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    media_urls: list[str] | None = Field(default=None, max_length=12)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    display_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name", "category", mode="before")
    @classmethod
    def normalize_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("description", "image_url", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if not isinstance(value, str):
            return value
        return value.strip() or None

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("media_urls")
    @classmethod
    def validate_media_urls(cls, value: list[str] | None) -> list[str] | None:
        return _normalize_media_urls(value) if value is not None else None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        required_fields = {
            "name",
            "category",
            "price",
            "currency",
            "display_order",
            "is_active",
            "media_urls",
        }
        for field in required_fields & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"Le champ {field} ne peut pas etre vide.")
        return self


class CafeMenuItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    category: str
    description: str | None
    image_url: str | None
    media_urls: list[str]
    price: Decimal
    currency: str
    display_order: int
    is_active: bool
    created_by_id: uuid.UUID | None
    updated_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CafeMenuMediaRead(BaseModel):
    media_url: str


def _normalize_media_urls(value: list[str]) -> list[str]:
    normalized: list[str] = []
    for raw_url in value:
        url = raw_url.strip()
        if not url or url in normalized:
            continue
        if len(url) > 500:
            raise ValueError("Chaque lien media doit contenir au maximum 500 caracteres.")
        normalized.append(url)
    return normalized
