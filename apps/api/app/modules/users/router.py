import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    MemberProfileUpdate,
    UserAdminUpdate,
    UserCreate,
    UserRead,
    UserUpdateRoleStatus,
)
from app.modules.users.service import UserService
from app.shared.enums import UserRole

router = APIRouter(prefix="/users", tags=["Users"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/me", response_model=UserRead)
def me(actor: CurrentUser) -> CurrentUser:
    return actor


@router.post("/{user_id}/profile-photo", response_model=UserRead)
async def upload_member_photo(
    user_id: uuid.UUID,
    session: DbSession,
    actor: CurrentUser,
    photo: Annotated[UploadFile, File()],
):
    return await UserService(session).upload_member_photo(user_id, photo, actor)


@router.get("", response_model=list[UserRead])
def list_users(
    session: DbSession,
    actor: Admin,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    return UserRepository(session).list(limit=limit)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, session: DbSession, actor: Admin):
    return UserService(session).create(data, actor)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: uuid.UUID, data: UserAdminUpdate, session: DbSession, actor: Admin):
    return UserService(session).update_as_admin(user_id, data, actor)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, session: DbSession, actor: Admin) -> None:
    UserService(session).delete(user_id, actor)


@router.patch("/{user_id}/role-status", response_model=UserRead)
def update_role_status(
    user_id: uuid.UUID, data: UserUpdateRoleStatus, session: DbSession, actor: Admin
):
    return UserService(session).update_role_status(user_id, data, actor)


@router.patch("/{user_id}/member-profile", response_model=UserRead)
def update_member_profile(
    user_id: uuid.UUID, data: MemberProfileUpdate, session: DbSession, actor: Admin
):
    return UserService(session).update_member_profile(user_id, data, actor)
