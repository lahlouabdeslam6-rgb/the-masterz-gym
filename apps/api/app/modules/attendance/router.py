import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.core.errors import api_error
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import AttendanceCreate, AttendanceRead, MemberSearchResult
from app.modules.attendance.service import AttendanceService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import UserRole

router = APIRouter(prefix="/attendance", tags=["Attendance"])
Reception = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.get("/members/search", response_model=list[MemberSearchResult])
def search_members(
    query: str,
    session: DbSession,
    actor: Reception,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    return UserRepository(session).search_members(query, limit=limit)


@router.post("/check-ins", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def check_in(data: AttendanceCreate, session: DbSession, actor: Reception):
    return AttendanceService(session).check_in(data, actor)


@router.get("/members/{member_id}", response_model=list[AttendanceRead])
def list_member_attendance(
    member_id: uuid.UUID,
    session: DbSession,
    actor: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    if actor.role not in {UserRole.ADMIN, UserRole.RECEPTIONIST} and actor.id != member_id:
        raise api_error(403, "permission_denied", "Accès interdit.")
    return AttendanceRepository(session).list_member_attendance(member_id, limit=limit)
