import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.coaching.models import (
    CoachAvailability,
    CoachingAssessment,
    CoachingAssignmentRequest,
    CoachingBooking,
    CoachingClientProfile,
    CoachMemberAssignment,
)
from app.modules.users.models import User
from app.shared.enums import (
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    UserRole,
)


class CoachingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_coaches(self) -> list[User]:
        return list(
            self.session.scalars(
                select(User).where(User.role == UserRole.COACH).order_by(User.full_name)
            )
        )

    def active_member_count(self, coach_id: uuid.UUID) -> int:
        return int(
            self.session.scalar(
                select(func.count(CoachMemberAssignment.id)).where(
                    CoachMemberAssignment.coach_id == coach_id,
                    CoachMemberAssignment.ended_at.is_(None),
                )
            )
            or 0
        )

    def list_assignments(
        self,
        *,
        active_only: bool = True,
        coach_id: uuid.UUID | None = None,
        member_id: uuid.UUID | None = None,
    ) -> list[CoachMemberAssignment]:
        statement = select(CoachMemberAssignment)
        if active_only:
            statement = statement.where(CoachMemberAssignment.ended_at.is_(None))
        if coach_id:
            statement = statement.where(CoachMemberAssignment.coach_id == coach_id)
        if member_id:
            statement = statement.where(CoachMemberAssignment.member_id == member_id)
        statement = statement.order_by(CoachMemberAssignment.started_at.desc())
        return list(self.session.scalars(statement))

    def active_assignment_for_member(
        self, member_id: uuid.UUID, *, for_update: bool = False
    ) -> CoachMemberAssignment | None:
        statement = select(CoachMemberAssignment).where(
            CoachMemberAssignment.member_id == member_id,
            CoachMemberAssignment.ended_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def get_assignment(self, assignment_id: uuid.UUID) -> CoachMemberAssignment | None:
        return self.session.get(CoachMemberAssignment, assignment_id)

    def add_assignment(self, assignment: CoachMemberAssignment) -> CoachMemberAssignment:
        self.session.add(assignment)
        self.session.flush()
        return assignment

    def add_assignment_request(
        self, request: CoachingAssignmentRequest
    ) -> CoachingAssignmentRequest:
        self.session.add(request)
        self.session.flush()
        return request

    def save_assignment_request(
        self, request: CoachingAssignmentRequest
    ) -> CoachingAssignmentRequest:
        self.session.add(request)
        self.session.flush()
        return request

    def get_assignment_request(
        self, request_id: uuid.UUID, *, for_update: bool = False
    ) -> CoachingAssignmentRequest | None:
        statement = select(CoachingAssignmentRequest).where(
            CoachingAssignmentRequest.id == request_id
        )
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def pending_assignment_request_for_member(
        self, member_id: uuid.UUID
    ) -> CoachingAssignmentRequest | None:
        return self.session.scalar(
            select(CoachingAssignmentRequest).where(
                CoachingAssignmentRequest.member_id == member_id,
                CoachingAssignmentRequest.status == CoachingAssignmentRequestStatus.PENDING,
            )
        )

    def list_assignment_requests(
        self,
        *,
        member_id: uuid.UUID | None = None,
        request_status: CoachingAssignmentRequestStatus | None = None,
        limit: int = 200,
    ) -> list[CoachingAssignmentRequest]:
        statement = select(CoachingAssignmentRequest)
        if member_id:
            statement = statement.where(CoachingAssignmentRequest.member_id == member_id)
        if request_status:
            statement = statement.where(CoachingAssignmentRequest.status == request_status)
        return list(
            self.session.scalars(
                statement.order_by(CoachingAssignmentRequest.created_at.desc()).limit(limit)
            )
        )

    def active_assignment_for_coach_member(
        self, coach_id: uuid.UUID, member_id: uuid.UUID
    ) -> CoachMemberAssignment | None:
        return self.session.scalar(
            select(CoachMemberAssignment).where(
                CoachMemberAssignment.coach_id == coach_id,
                CoachMemberAssignment.member_id == member_id,
                CoachMemberAssignment.ended_at.is_(None),
            )
        )

    def get_profile(self, member_id: uuid.UUID) -> CoachingClientProfile | None:
        return self.session.scalar(
            select(CoachingClientProfile).where(CoachingClientProfile.member_id == member_id)
        )

    def add_profile(self, profile: CoachingClientProfile) -> CoachingClientProfile:
        self.session.add(profile)
        self.session.flush()
        return profile

    def list_assessments(
        self, member_id: uuid.UUID, *, limit: int = 100
    ) -> list[CoachingAssessment]:
        return list(
            self.session.scalars(
                select(CoachingAssessment)
                .where(CoachingAssessment.member_id == member_id)
                .order_by(
                    CoachingAssessment.measured_at.desc(),
                    CoachingAssessment.created_at.desc(),
                )
                .limit(limit)
            )
        )

    def add_assessment(self, assessment: CoachingAssessment) -> CoachingAssessment:
        self.session.add(assessment)
        self.session.flush()
        return assessment

    def list_availabilities(
        self,
        *,
        coach_id: uuid.UUID | None = None,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
        active_only: bool = True,
    ) -> list[CoachAvailability]:
        statement = select(CoachAvailability)
        if coach_id:
            statement = statement.where(CoachAvailability.coach_id == coach_id)
        if from_at:
            statement = statement.where(CoachAvailability.ends_at > from_at)
        if to_at:
            statement = statement.where(CoachAvailability.starts_at < to_at)
        if active_only:
            statement = statement.where(CoachAvailability.is_active.is_(True))
        return list(self.session.scalars(statement.order_by(CoachAvailability.starts_at)))

    def get_availability(self, availability_id: uuid.UUID) -> CoachAvailability | None:
        return self.session.get(CoachAvailability, availability_id)

    def add_availability(self, availability: CoachAvailability) -> CoachAvailability:
        self.session.add(availability)
        self.session.flush()
        return availability

    def save_availability(self, availability: CoachAvailability) -> CoachAvailability:
        self.session.add(availability)
        self.session.flush()
        return availability

    def availability_booking_count(
        self,
        availability_id: uuid.UUID,
        *,
        statuses: set[CoachingBookingStatus],
    ) -> int:
        return int(
            self.session.scalar(
                select(func.count(CoachingBooking.id)).where(
                    CoachingBooking.availability_id == availability_id,
                    CoachingBooking.status.in_(tuple(statuses)),
                )
            )
            or 0
        )

    def get_booking(
        self, booking_id: uuid.UUID, *, for_update: bool = False
    ) -> CoachingBooking | None:
        statement = select(CoachingBooking).where(CoachingBooking.id == booking_id)
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def add_booking(self, booking: CoachingBooking) -> CoachingBooking:
        self.session.add(booking)
        self.session.flush()
        return booking

    def save_booking(self, booking: CoachingBooking) -> CoachingBooking:
        self.session.add(booking)
        self.session.flush()
        return booking

    def list_bookings(
        self,
        *,
        coach_id: uuid.UUID | None = None,
        member_id: uuid.UUID | None = None,
        booking_status: CoachingBookingStatus | None = None,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
        limit: int = 200,
    ) -> list[CoachingBooking]:
        statement = select(CoachingBooking)
        if coach_id:
            statement = statement.where(CoachingBooking.coach_id == coach_id)
        if member_id:
            statement = statement.where(CoachingBooking.member_id == member_id)
        if booking_status:
            statement = statement.where(CoachingBooking.status == booking_status)
        if from_at:
            statement = statement.where(CoachingBooking.ends_at > from_at)
        if to_at:
            statement = statement.where(CoachingBooking.starts_at < to_at)
        return list(
            self.session.scalars(statement.order_by(CoachingBooking.starts_at.desc()).limit(limit))
        )

    def overlapping_bookings(
        self,
        *,
        coach_id: uuid.UUID | None = None,
        member_id: uuid.UUID | None = None,
        starts_at: datetime,
        ends_at: datetime,
        statuses: set[CoachingBookingStatus],
        exclude_booking_id: uuid.UUID | None = None,
    ) -> list[CoachingBooking]:
        statement = select(CoachingBooking).where(
            CoachingBooking.status.in_(tuple(statuses)),
            CoachingBooking.starts_at < ends_at,
            CoachingBooking.ends_at > starts_at,
        )
        if coach_id:
            statement = statement.where(CoachingBooking.coach_id == coach_id)
        if member_id:
            statement = statement.where(CoachingBooking.member_id == member_id)
        if exclude_booking_id:
            statement = statement.where(CoachingBooking.id != exclude_booking_id)
        return list(self.session.scalars(statement.order_by(CoachingBooking.starts_at)))

    def lock_coach_schedule(self, coach_id: uuid.UUID) -> None:
        self.session.scalar(select(User.id).where(User.id == coach_id).with_for_update())
