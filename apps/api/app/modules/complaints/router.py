import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.complaints.schemas import (
    ComplaintCreate,
    ComplaintMessageCreate,
    ComplaintRead,
    ComplaintStatusUpdate,
)
from app.modules.complaints.service import ComplaintService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/complaints", tags=["Complaints"])
Reader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER)),
]
Member = Annotated[User, Depends(require_roles(UserRole.MEMBER))]
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(data: ComplaintCreate, session: DbSession, actor: Member):
    return ComplaintService(session).create(data, actor)


@router.get("", response_model=list[ComplaintRead])
def list_complaints(
    session: DbSession,
    actor: Reader,
    limit: Annotated[int, Query(ge=1, le=300)] = 100,
):
    return ComplaintService(session).list(actor, limit=limit)


@router.post("/{complaint_id}/messages", response_model=ComplaintRead)
def reply_to_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintMessageCreate,
    session: DbSession,
    actor: Reader,
):
    return ComplaintService(session).reply(complaint_id, data, actor)


@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def update_complaint_status(
    complaint_id: uuid.UUID,
    data: ComplaintStatusUpdate,
    session: DbSession,
    actor: Staff,
):
    return ComplaintService(session).update_status(complaint_id, data, actor)
