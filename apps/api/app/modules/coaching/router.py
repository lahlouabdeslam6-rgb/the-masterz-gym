import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.coaching.schemas import (
    CoachAvailabilityCreate,
    CoachAvailabilityRead,
    CoachAvailabilityUpdate,
    CoachDirectoryRead,
    CoachingAssessmentCreate,
    CoachingAssessmentRead,
    CoachingAssignmentRequestCreate,
    CoachingAssignmentRequestDecision,
    CoachingAssignmentRequestRead,
    CoachingBookingCreate,
    CoachingBookingRead,
    CoachingBookingReschedule,
    CoachingBookingStatusUpdate,
    CoachingObjectiveRead,
    CoachingObjectiveUpdate,
    CoachingTrackingRead,
    CoachMemberAssignmentCreate,
    CoachMemberAssignmentEnd,
    CoachMemberAssignmentRead,
    CoachSummary,
)
from app.modules.coaching.service import CoachingService
from app.modules.users.models import User
from app.shared.enums import (
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    UserRole,
)

router = APIRouter(prefix="/coaching", tags=["Coaching"])
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]
Coach = Annotated[User, Depends(require_roles(UserRole.COACH))]
TrackingReader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.COACH, UserRole.MEMBER)),
]
ScheduleReader = Annotated[
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
AssignmentRequestReader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER)),
]
Member = Annotated[User, Depends(require_roles(UserRole.MEMBER))]


@router.get("/coaches", response_model=list[CoachSummary])
def list_coaches(session: DbSession, actor: Staff):
    return CoachingService(session).list_coaches()


@router.get("/directory", response_model=list[CoachDirectoryRead])
def list_coach_directory(session: DbSession, actor: AssignmentRequestReader):
    return CoachingService(session).list_coach_directory(actor)


@router.get(
    "/my-assignment",
    response_model=CoachMemberAssignmentRead | None,
)
def get_my_assignment(session: DbSession, actor: Member):
    return CoachingService(session).get_my_assignment(actor)


@router.get(
    "/assignment-requests",
    response_model=list[CoachingAssignmentRequestRead],
)
def list_assignment_requests(
    session: DbSession,
    actor: AssignmentRequestReader,
    request_status: Annotated[CoachingAssignmentRequestStatus | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
):
    return CoachingService(session).list_assignment_requests(
        actor,
        request_status=request_status,
        limit=limit,
    )


@router.post(
    "/assignment-requests",
    response_model=CoachingAssignmentRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment_request(
    data: CoachingAssignmentRequestCreate,
    session: DbSession,
    actor: Member,
):
    return CoachingService(session).create_assignment_request(data, actor)


@router.patch(
    "/assignment-requests/{request_id}/decision",
    response_model=CoachingAssignmentRequestRead,
)
def decide_assignment_request(
    request_id: uuid.UUID,
    data: CoachingAssignmentRequestDecision,
    session: DbSession,
    actor: Staff,
):
    return CoachingService(session).decide_assignment_request(
        request_id,
        data,
        actor,
    )


@router.get("/assignments", response_model=list[CoachMemberAssignmentRead])
def list_assignments(
    session: DbSession,
    actor: Staff,
    active_only: Annotated[bool, Query()] = True,
    coach_id: Annotated[uuid.UUID | None, Query()] = None,
    member_id: Annotated[uuid.UUID | None, Query()] = None,
):
    return CoachingService(session).list_assignments(
        active_only=active_only,
        coach_id=coach_id,
        member_id=member_id,
    )


@router.get("/my-members", response_model=list[CoachMemberAssignmentRead])
def list_my_members(session: DbSession, actor: Coach):
    return CoachingService(session).list_assignments(coach_id=actor.id)


@router.get(
    "/members/{member_id}/tracking",
    response_model=CoachingTrackingRead,
)
def get_member_tracking(
    member_id: uuid.UUID,
    session: DbSession,
    actor: TrackingReader,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    return CoachingService(session).get_tracking(member_id, actor, limit=limit)


@router.patch(
    "/members/{member_id}/objective",
    response_model=CoachingObjectiveRead,
)
def update_member_objective(
    member_id: uuid.UUID,
    data: CoachingObjectiveUpdate,
    session: DbSession,
    actor: Coach,
):
    return CoachingService(session).update_objective(member_id, data, actor)


@router.post(
    "/members/{member_id}/assessments",
    response_model=CoachingAssessmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_member_assessment(
    member_id: uuid.UUID,
    data: CoachingAssessmentCreate,
    session: DbSession,
    actor: Coach,
):
    return CoachingService(session).create_assessment(member_id, data, actor)


@router.post(
    "/assignments",
    response_model=CoachMemberAssignmentRead,
    status_code=status.HTTP_201_CREATED,
)
def assign_member(data: CoachMemberAssignmentCreate, session: DbSession, actor: Staff):
    return CoachingService(session).assign_member(data, actor)


@router.patch(
    "/assignments/{assignment_id}/end",
    response_model=CoachMemberAssignmentRead,
)
def end_assignment(
    assignment_id: uuid.UUID,
    data: CoachMemberAssignmentEnd,
    session: DbSession,
    actor: Staff,
):
    return CoachingService(session).end_assignment(assignment_id, data, actor)


@router.get("/availability", response_model=list[CoachAvailabilityRead])
def list_availability(
    session: DbSession,
    actor: ScheduleReader,
    coach_id: Annotated[uuid.UUID | None, Query()] = None,
    from_at: Annotated[datetime | None, Query()] = None,
    to_at: Annotated[datetime | None, Query()] = None,
    active_only: Annotated[bool, Query()] = True,
):
    return CoachingService(session).list_availability(
        actor,
        coach_id=coach_id,
        from_at=from_at,
        to_at=to_at,
        active_only=active_only,
    )


@router.post(
    "/availability",
    response_model=CoachAvailabilityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_availability(
    data: CoachAvailabilityCreate,
    session: DbSession,
    actor: Coach,
):
    return CoachingService(session).create_availability(data, actor)


@router.patch("/availability/{availability_id}", response_model=CoachAvailabilityRead)
def update_availability(
    availability_id: uuid.UUID,
    data: CoachAvailabilityUpdate,
    session: DbSession,
    actor: Coach,
):
    return CoachingService(session).update_availability(availability_id, data, actor)


@router.get("/bookings", response_model=list[CoachingBookingRead])
def list_bookings(
    session: DbSession,
    actor: ScheduleReader,
    coach_id: Annotated[uuid.UUID | None, Query()] = None,
    member_id: Annotated[uuid.UUID | None, Query()] = None,
    booking_status: Annotated[CoachingBookingStatus | None, Query()] = None,
    from_at: Annotated[datetime | None, Query()] = None,
    to_at: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
):
    return CoachingService(session).list_bookings(
        actor,
        coach_id=coach_id,
        member_id=member_id,
        booking_status=booking_status,
        from_at=from_at,
        to_at=to_at,
        limit=limit,
    )


@router.post(
    "/bookings",
    response_model=CoachingBookingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_booking(
    data: CoachingBookingCreate,
    session: DbSession,
    actor: Annotated[User, Depends(require_roles(UserRole.MEMBER))],
):
    return CoachingService(session).create_booking(data, actor)


@router.patch("/bookings/{booking_id}/status", response_model=CoachingBookingRead)
def update_booking_status(
    booking_id: uuid.UUID,
    data: CoachingBookingStatusUpdate,
    session: DbSession,
    actor: ScheduleReader,
):
    return CoachingService(session).update_booking_status(booking_id, data, actor)


@router.patch("/bookings/{booking_id}/schedule", response_model=CoachingBookingRead)
def reschedule_booking(
    booking_id: uuid.UUID,
    data: CoachingBookingReschedule,
    session: DbSession,
    actor: Annotated[
        User,
        Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.COACH)),
    ],
):
    return CoachingService(session).reschedule_booking(booking_id, data, actor)
