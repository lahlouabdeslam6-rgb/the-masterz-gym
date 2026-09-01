import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.modules.clubs.repository import ClubRepository
from app.modules.clubs.schemas import (
    ClubRead,
    ClubUpdate,
    MyClubAccessRead,
    UserClubAssignmentRead,
    UserClubAssignmentsUpdate,
)
from app.modules.clubs.service import ClubService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/clubs", tags=["Clubs"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=list[ClubRead])
def list_clubs(
    session: DbSession,
    active_only: Annotated[bool, Query()] = True,
):
    return ClubRepository(session).list(active_only=active_only)


@router.get("/my-access", response_model=MyClubAccessRead)
def my_club_access(session: DbSession, actor: CurrentUser):
    return MyClubAccessRead(
        user_id=actor.id,
        role=actor.role,
        clubs=ClubService(session).clubs_for(actor),
    )


@router.patch("/{club_id}", response_model=ClubRead)
def update_club(club_id: uuid.UUID, data: ClubUpdate, session: DbSession, actor: Admin):
    return ClubService(session).update(club_id, data, actor)


@router.get(
    "/users/{user_id}/assignments",
    response_model=list[UserClubAssignmentRead],
)
def user_club_assignments(user_id: uuid.UUID, session: DbSession, actor: Admin):
    return ClubRepository(session).assignments_for_user(user_id)


@router.put(
    "/users/{user_id}/assignments",
    response_model=list[UserClubAssignmentRead],
)
def replace_user_club_assignments(
    user_id: uuid.UUID,
    data: UserClubAssignmentsUpdate,
    session: DbSession,
    actor: Admin,
):
    return ClubService(session).assign_user(user_id, data, actor)
