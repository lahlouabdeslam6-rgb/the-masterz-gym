import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.core.dependencies import DbSession, require_roles
from app.modules.store.media import StoreMediaService
from app.modules.store.schemas import (
    StoreCatalogProductRead,
    StoreProductCreate,
    StoreProductMediaRead,
    StoreProductRead,
    StoreProductUpdate,
    StoreReservationCreate,
    StoreReservationRead,
    StoreReservationStatusUpdate,
    StoreSaleCreate,
    StoreSaleRead,
)
from app.modules.store.service import StoreService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/store", tags=["Store"])
Reader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER)),
]
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]
Member = Annotated[User, Depends(require_roles(UserRole.MEMBER))]


@router.get("/catalog", response_model=list[StoreCatalogProductRead])
def list_public_catalog(session: DbSession):
    return StoreService(session).list_public_catalog()


@router.get("/products", response_model=list[StoreProductRead])
def list_products(
    session: DbSession,
    actor: Reader,
    active_only: bool = True,
):
    return StoreService(session).list_products(actor, active_only=active_only)


@router.post("/products", response_model=StoreProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: StoreProductCreate, session: DbSession, actor: Admin):
    return StoreService(session).create_product(data, actor)


@router.post(
    "/product-media",
    response_model=StoreProductMediaRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_media(actor: Admin, media: Annotated[UploadFile, File()]):
    del actor
    media_url = await StoreMediaService().save_product_media(media)
    return StoreProductMediaRead(media_url=media_url)


@router.patch("/products/{product_id}", response_model=StoreProductRead)
def update_product(
    product_id: uuid.UUID,
    data: StoreProductUpdate,
    session: DbSession,
    actor: Admin,
):
    return StoreService(session).update_product(product_id, data, actor)


@router.get("/reservations", response_model=list[StoreReservationRead])
def list_reservations(
    session: DbSession,
    actor: Reader,
    limit: Annotated[int, Query(ge=1, le=300)] = 100,
):
    return StoreService(session).list_reservations(actor, limit=limit)


@router.post(
    "/reservations",
    response_model=StoreReservationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_reservation(data: StoreReservationCreate, session: DbSession, actor: Member):
    return StoreService(session).create_reservation(data, actor)


@router.patch(
    "/reservations/{reservation_id}/status",
    response_model=StoreReservationRead,
)
def update_reservation_status(
    reservation_id: uuid.UUID,
    data: StoreReservationStatusUpdate,
    session: DbSession,
    actor: Staff,
):
    return StoreService(session).update_reservation_status(reservation_id, data, actor)


@router.get("/sales", response_model=list[StoreSaleRead])
def list_sales(
    session: DbSession,
    actor: Staff,
    limit: Annotated[int, Query(ge=1, le=300)] = 100,
):
    return StoreService(session).list_sales(limit=limit)


@router.post("/sales", response_model=StoreSaleRead, status_code=status.HTTP_201_CREATED)
def record_sale(data: StoreSaleCreate, session: DbSession, actor: Staff):
    return StoreService(session).record_sale(data, actor)
