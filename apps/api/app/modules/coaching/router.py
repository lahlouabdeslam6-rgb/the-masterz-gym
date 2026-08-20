import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.coaching.schemas import (
    CoachingAssessmentCreate,
    CoachingAssessmentRead,
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
from app.shared.enums import UserRole

router = APIRouter(prefix="/coaching", tags=["Coaching"])
Staff = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]
Coach = Annotated[User, Depends(require_roles(UserRole.COACH))]
TrackingReader = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.COACH, UserRole.MEMBER)),
]


@router.get("/coaches", response_model=list[CoachSummary])
def list_coaches(session: DbSession, actor: Staff):
    return CoachingService(session).list_coaches()


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
