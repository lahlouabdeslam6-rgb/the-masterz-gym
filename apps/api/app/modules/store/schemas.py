import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.shared.enums import StorePaymentMethod, StoreReservationStatus


class StoreProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    currency: str = Field(min_length=3, max_length=3)
    stock_quantity: int = Field(ge=0)
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value):
        return value.strip().upper() if isinstance(value, str) else value


class StoreProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    stock_quantity: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        required_fields = {
            "name",
            "price",
            "currency",
            "stock_quantity",
            "is_active",
        }
        for field in required_fields & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"Le champ {field} ne peut pas etre vide.")
        return self


class StoreProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    image_url: str | None
    price: Decimal
    currency: str
    stock_quantity: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StoreProductMediaRead(BaseModel):
    media_url: str


class StoreCatalogProductRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    image_url: str | None
    price: Decimal
    currency: str
    is_available: bool


class StoreReservationCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1)


class StoreReservationStatusUpdate(BaseModel):
    status: StoreReservationStatus
    notes: str | None = Field(default=None, max_length=2000)
    payment_method: StorePaymentMethod | None = None

    @model_validator(mode="after")
    def require_payment_for_completion(self):
        if self.status == StoreReservationStatus.COMPLETED and not self.payment_method:
            raise ValueError("Le mode de paiement est obligatoire pour terminer la vente.")
        return self


class StoreReservationRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_image_url: str | None
    member_id: uuid.UUID
    member_name: str
    member_number: str
    member_phone: str
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    currency: str
    status: StoreReservationStatus
    processed_by_id: uuid.UUID | None
    processed_by_name: str | None
    processed_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class StoreSaleCreate(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=160)
    product_id: uuid.UUID
    member_id: uuid.UUID | None = None
    buyer_name: str | None = Field(default=None, max_length=160)
    quantity: int = Field(ge=1)
    payment_method: StorePaymentMethod

    @model_validator(mode="after")
    def require_buyer(self):
        if self.member_id is None and not (self.buyer_name or "").strip():
            raise ValueError("Le nom du client local est obligatoire.")
        return self


class StoreSaleRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    reservation_id: uuid.UUID | None
    product_name: str
    member_id: uuid.UUID | None
    buyer_name: str
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    currency: str
    payment_method: StorePaymentMethod
    recorded_by_id: uuid.UUID
    recorded_by_name: str
    created_at: datetime
