import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.coaching.models import CoachMemberAssignment
from app.modules.users.models import User
from app.shared.enums import UserRole


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
