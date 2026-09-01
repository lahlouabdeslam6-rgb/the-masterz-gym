import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.dependencies import DbSession, require_roles
from app.modules.cafe.media import CafeMediaService
from app.modules.cafe.schemas import (
    CafeMenuItemCreate,
    CafeMenuItemRead,
    CafeMenuItemUpdate,
    CafeMenuMediaRead,
)
from app.modules.cafe.service import CafeService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/cafe", tags=["Healthy Cafe"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/menu", response_model=list[CafeMenuItemRead])
def list_public_menu(session: DbSession):
    return CafeService(session).list_public_menu()


@router.get("/menu-items", response_model=list[CafeMenuItemRead])
def list_admin_menu(session: DbSession, actor: Admin):
    del actor
    return CafeService(session).list_admin_menu()


@router.post(
    "/menu-items",
    response_model=CafeMenuItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_menu_item(data: CafeMenuItemCreate, session: DbSession, actor: Admin):
    return CafeService(session).create(data, actor)


@router.patch("/menu-items/{item_id}", response_model=CafeMenuItemRead)
def update_menu_item(
    item_id: uuid.UUID,
    data: CafeMenuItemUpdate,
    session: DbSession,
    actor: Admin,
):
    return CafeService(session).update(item_id, data, actor)


@router.delete(
    "/menu-items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_menu_item(item_id: uuid.UUID, session: DbSession, actor: Admin) -> None:
    CafeService(session).delete(item_id, actor)


@router.post("/menu-media", response_model=CafeMenuMediaRead)
async def upload_menu_media(
    actor: Admin,
    media: Annotated[UploadFile, File(...)],
):
    del actor
    media_url = await CafeMediaService().save_menu_media(media)
    return CafeMenuMediaRead(media_url=media_url)
