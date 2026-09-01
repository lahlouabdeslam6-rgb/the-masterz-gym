from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.clubs.models import Club, UserClubAssignment


class ClubRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, club_id: uuid.UUID) -> Club | None:
        return self.session.get(Club, club_id)

    def list(self, *, active_only: bool = True) -> list[Club]:
        statement = select(Club).order_by(Club.label)
        if active_only:
            statement = statement.where(Club.is_active.is_(True))
        return list(self.session.scalars(statement))

    def list_for_user(self, user_id: uuid.UUID) -> list[Club]:
        return list(
            self.session.scalars(
                select(Club)
                .join(UserClubAssignment, UserClubAssignment.club_id == Club.id)
                .where(UserClubAssignment.user_id == user_id, Club.is_active.is_(True))
                .order_by(Club.label)
            )
        )

    def assignments_for_user(self, user_id: uuid.UUID) -> list[UserClubAssignment]:
        return list(
            self.session.scalars(
                select(UserClubAssignment)
                .where(UserClubAssignment.user_id == user_id)
                .order_by(UserClubAssignment.created_at)
            )
        )

    def replace_assignments(
        self, user_id: uuid.UUID, club_ids: list[uuid.UUID], assigned_by_id: uuid.UUID
    ) -> list[UserClubAssignment]:
        self.session.execute(
            delete(UserClubAssignment).where(UserClubAssignment.user_id == user_id)
        )
        assignments = [
            UserClubAssignment(
                user_id=user_id,
                club_id=club_id,
                assigned_by_id=assigned_by_id,
            )
            for club_id in club_ids
        ]
        self.session.add_all(assignments)
        self.session.flush()
        return assignments

    def ensure_assignment(
        self,
        user_id: uuid.UUID,
        club_id: uuid.UUID,
        assigned_by_id: uuid.UUID | None = None,
    ) -> UserClubAssignment:
        assignment = self.session.scalar(
            select(UserClubAssignment).where(
                UserClubAssignment.user_id == user_id,
                UserClubAssignment.club_id == club_id,
            )
        )
        if assignment:
            return assignment
        assignment = UserClubAssignment(
            user_id=user_id,
            club_id=club_id,
            assigned_by_id=assigned_by_id,
        )
        self.session.add(assignment)
        self.session.flush()
        return assignment
