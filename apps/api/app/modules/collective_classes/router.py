import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.collective_classes.schemas import (
    CollectiveClassReservationCancel,
    CollectiveClassReservationRead,
    CollectiveClassReservationStatusUpdate,
    CollectiveClassSessionCreate,
    CollectiveClassSessionRead,
    CollectiveClassSessionUpdate,
    CollectiveClassTypeCreate,
    CollectiveClassTypeRead,
    CollectiveClassTypeUpdate,
)
from app.modules.collective_classes.service import CollectiveClassService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/collective-classes", tags=["Collective classes"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Manager = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.COACH)),
]
Reader = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.RECEPTIONIST,
            UserRole.COACH,
            UserRole.MEMBER,
        )
    ),
]
Member = Annotated[User, Depends(require_roles(UserRole.MEMBER))]


@router.get("/types", response_model=list[CollectiveClassTypeRead])
def list_class_types(
    session: DbSession,
    actor: Reader,
    club_id: Annotated[uuid.UUID, Query()],
    active_only: Annotated[bool, Query()] = True,
):
    return CollectiveClassService(session).list_class_types(
        club_id,
        actor,
        active_only=active_only,
    )


@router.post(
    "/types",
    response_model=CollectiveClassTypeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_class_type(
    data: CollectiveClassTypeCreate,
    session: DbSession,
    actor: Admin,
):
    return CollectiveClassService(session).create_class_type(data, actor)


@router.patch("/types/{class_type_id}", response_model=CollectiveClassTypeRead)
def update_class_type(
    class_type_id: uuid.UUID,
    data: CollectiveClassTypeUpdate,
    session: DbSession,
    actor: Admin,
):
    return CollectiveClassService(session).update_class_type(class_type_id, data, actor)


@router.get("/sessions", response_model=list[CollectiveClassSessionRead])
def list_sessions(
    session: DbSession,
    actor: Reader,
    club_id: Annotated[uuid.UUID, Query()],
    coach_id: Annotated[uuid.UUID | None, Query()] = None,
    from_at: Annotated[datetime | None, Query()] = None,
    to_at: Annotated[datetime | None, Query()] = None,
    include_history: Annotated[bool, Query()] = False,
):
    return CollectiveClassService(session).list_sessions(
        club_id,
        actor,
        coach_id=coach_id,
        from_at=from_at,
        to_at=to_at,
        include_history=include_history,
    )


@router.post(
    "/sessions",
    response_model=CollectiveClassSessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    data: CollectiveClassSessionCreate,
    session: DbSession,
    actor: Manager,
):
    return CollectiveClassService(session).create_session(data, actor)


@router.patch("/sessions/{session_id}", response_model=CollectiveClassSessionRead)
def update_session(
    session_id: uuid.UUID,
    data: CollectiveClassSessionUpdate,
    session: DbSession,
    actor: Manager,
):
    return CollectiveClassService(session).update_session(session_id, data, actor)


@router.get(
    "/sessions/{session_id}/reservations",
    response_model=list[CollectiveClassReservationRead],
)
def list_session_reservations(
    session_id: uuid.UUID,
    session: DbSession,
    actor: Manager,
):
    return CollectiveClassService(session).list_session_reservations(session_id, actor)


@router.post(
    "/sessions/{session_id}/reservations",
    response_model=CollectiveClassReservationRead,
    status_code=status.HTTP_201_CREATED,
)
def reserve_session(
    session_id: uuid.UUID,
    session: DbSession,
    actor: Member,
):
    return CollectiveClassService(session).reserve(session_id, actor)


@router.get(
    "/my-reservations",
    response_model=list[CollectiveClassReservationRead],
)
def list_my_reservations(
    session: DbSession,
    actor: Member,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
):
    return CollectiveClassService(session).list_my_reservations(actor, limit=limit)


@router.patch(
    "/reservations/{reservation_id}/cancel",
    response_model=CollectiveClassReservationRead,
)
def cancel_reservation(
    reservation_id: uuid.UUID,
    data: CollectiveClassReservationCancel,
    session: DbSession,
    actor: Reader,
):
    return CollectiveClassService(session).cancel_reservation(reservation_id, data, actor)


@router.patch(
    "/reservations/{reservation_id}/status",
    response_model=CollectiveClassReservationRead,
)
def update_reservation_status(
    reservation_id: uuid.UUID,
    data: CollectiveClassReservationStatusUpdate,
    session: DbSession,
    actor: Manager,
):
    return CollectiveClassService(session).update_reservation_status(
        reservation_id,
        data,
        actor,
    )
