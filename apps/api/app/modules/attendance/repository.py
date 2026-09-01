import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.attendance.models import Attendance
from app.shared.enums import AttendanceDecision


class AttendanceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, attendance: Attendance) -> Attendance:
        self.session.add(attendance)
        self.session.flush()
        return attendance

    def recent_accepted(
        self, member_id: uuid.UUID, since: datetime, club_id: uuid.UUID | None = None
    ) -> Attendance | None:
        statement = select(Attendance).where(
            Attendance.member_id == member_id,
            Attendance.checked_in_at >= since,
            Attendance.decision.in_(
                [
                    AttendanceDecision.ALLOWED,
                    AttendanceDecision.ALLOWED_WITH_WARNING,
                    AttendanceDecision.EXCEPTIONAL_ACCESS,
                ]
            ),
        )
        if club_id:
            statement = statement.where(Attendance.club_id == club_id)
        return self.session.scalar(statement.order_by(Attendance.checked_in_at.desc()).limit(1))

    def list_member_attendance(
        self,
        member_id: uuid.UUID,
        limit: int = 100,
        club_id: uuid.UUID | None = None,
    ) -> list[Attendance]:
        statement = select(Attendance).where(Attendance.member_id == member_id)
        if club_id:
            statement = statement.where(Attendance.club_id == club_id)
        return list(
            self.session.scalars(statement.order_by(Attendance.checked_in_at.desc()).limit(limit))
        )
