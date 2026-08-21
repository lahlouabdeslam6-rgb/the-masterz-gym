import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.recovery.schemas import (
    RecoveryClientSummary,
    RecoveryTrackingRead,
    RecoveryVisitCreate,
    RecoveryVisitRead,
)
from app.modules.recovery.service import RecoveryServiceManager
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/recovery", tags=["Recovery"])
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]
Reader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER)),
]


@router.get("/clients", response_model=list[RecoveryClientSummary])
def list_recovery_clients(
    session: DbSession,
    actor: Staff,
    query: Annotated[str | None, Query(max_length=160)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    return RecoveryServiceManager(session).list_clients(query=query, limit=limit)


@router.get("/members/{member_id}", response_model=RecoveryTrackingRead)
def get_recovery_tracking(
    member_id: uuid.UUID,
    session: DbSession,
    actor: Reader,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    return RecoveryServiceManager(session).get_tracking(member_id, actor, limit=limit)


@router.post("/visits", response_model=RecoveryVisitRead, status_code=status.HTTP_201_CREATED)
def record_recovery_visit(data: RecoveryVisitCreate, session: DbSession, actor: Staff):
    return RecoveryServiceManager(session).record_visit(data, actor)
