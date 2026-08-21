import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.complaints.models import Complaint, ComplaintMessage
from app.shared.enums import UserRole


class ComplaintRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, complaint: Complaint) -> Complaint:
        self.session.add(complaint)
        self.session.flush()
        return complaint

    def add_message(self, message: ComplaintMessage) -> ComplaintMessage:
        self.session.add(message)
        self.session.flush()
        return message

    def get(self, complaint_id: uuid.UUID) -> Complaint | None:
        return self.session.get(Complaint, complaint_id)

    def list_for_actor(
        self, actor_id: uuid.UUID, actor_role: UserRole, *, limit: int = 100
    ) -> list[Complaint]:
        statement = select(Complaint).order_by(
            Complaint.updated_at.desc(), Complaint.created_at.desc()
        )
        if actor_role == UserRole.MEMBER:
            statement = statement.where(Complaint.member_id == actor_id)
        elif actor_role == UserRole.RECEPTIONIST:
            statement = statement.where(Complaint.assigned_role == UserRole.RECEPTIONIST.value)
        return list(self.session.scalars(statement.limit(limit)))

    def list_messages(self, complaint_id: uuid.UUID) -> list[ComplaintMessage]:
        return list(
            self.session.scalars(
                select(ComplaintMessage)
                .where(ComplaintMessage.complaint_id == complaint_id)
                .order_by(ComplaintMessage.created_at, ComplaintMessage.id)
            )
        )

    def save(self, complaint: Complaint) -> Complaint:
        self.session.add(complaint)
        self.session.flush()
        return complaint
