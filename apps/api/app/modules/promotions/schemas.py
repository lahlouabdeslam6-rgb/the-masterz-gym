import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PromotionWrite(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    short_description: str = Field(min_length=3, max_length=280)
    description: str = Field(min_length=3, max_length=5000)
    base_plan_id: uuid.UUID
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="MAD", min_length=3, max_length=3)
    participant_count: int = Field(default=1, ge=1, le=20)
    starts_at: datetime
    ends_at: datetime
    terms: str | None = Field(default=None, max_length=5000)
    is_active: bool = True
    is_featured: bool = False

    @model_validator(mode="after")
    def validate_dates_and_visibility(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Les dates de l'offre doivent inclure un fuseau horaire.")
        if self.starts_at >= self.ends_at:
            raise ValueError("La date de fin doit etre posterieure a la date de debut.")
        if self.is_featured and not self.is_active:
            raise ValueError("Une offre mise en avant doit etre active.")
        return self


class PromotionCreate(PromotionWrite):
    pass


class PromotionUpdate(PromotionWrite):
    pass


class PromotionRead(PromotionWrite):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    base_plan_name: str = ""
    created_by_id: uuid.UUID | None
    updated_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
