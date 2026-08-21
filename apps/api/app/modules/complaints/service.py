import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.complaints.models import Complaint, ComplaintMessage
from app.modules.complaints.repository import ComplaintRepository
from app.modules.complaints.schemas import (
    ComplaintCreate,
    ComplaintMessageCreate,
    ComplaintMessageRead,
    ComplaintRead,
    ComplaintStatusUpdate,
)
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import ComplaintCategory, ComplaintStatus, UserRole

RECEPTION_CATEGORIES = {
    ComplaintCategory.PAYMENT,
    ComplaintCategory.SUBSCRIPTION,
    ComplaintCategory.ACCESS,
    ComplaintCategory.RESERVATION,
    ComplaintCategory.RECOVERY,
    ComplaintCategory.STORE,
}


class ComplaintService:
    def __init__(self, session: Session) -> None:
        self.complaints = ComplaintRepository(session)
        self.users = UserRepository(session)
        self.notifications = NotificationService(session)

    def create(self, data: ComplaintCreate, actor: User) -> ComplaintRead:
        assigned_role = (
            UserRole.RECEPTIONIST if data.category in RECEPTION_CATEGORIES else UserRole.ADMIN
        )
        complaint = self.complaints.add(
            Complaint(
                member_id=actor.id,
                category=data.category,
                assigned_role=assigned_role.value,
                subject=data.subject.strip(),
                status=ComplaintStatus.OPEN,
            )
        )
        self.complaints.add_message(
            ComplaintMessage(
                complaint_id=complaint.id,
                author_id=actor.id,
                author_name=actor.full_name,
                author_role=actor.role.value,
                body=data.message.strip(),
            )
        )
        return self._read(complaint)

    def list(self, actor: User, *, limit: int = 100) -> list[ComplaintRead]:
        return [
            self._read(complaint)
            for complaint in self.complaints.list_for_actor(actor.id, actor.role, limit=limit)
        ]

    def reply(
        self,
        complaint_id: uuid.UUID,
        data: ComplaintMessageCreate,
        actor: User,
    ) -> ComplaintRead:
        complaint = self._accessible(complaint_id, actor)
        message = self.complaints.add_message(
            ComplaintMessage(
                complaint_id=complaint.id,
                author_id=actor.id,
                author_name=actor.full_name,
                author_role=actor.role.value,
                body=data.body.strip(),
            )
        )
        complaint.updated_at = datetime.now(UTC)
        self.complaints.save(complaint)
        if actor.role in {UserRole.ADMIN, UserRole.RECEPTIONIST}:
            member = self.users.get(complaint.member_id)
            if member:
                self.notifications.complaint_reply(
                    member,
                    complaint_id=complaint.id,
                    message_id=message.id,
                    subject=complaint.subject,
                )
        return self._read(complaint)

    def update_status(
        self,
        complaint_id: uuid.UUID,
        data: ComplaintStatusUpdate,
        actor: User,
    ) -> ComplaintRead:
        complaint = self._accessible(complaint_id, actor)
        complaint.status = data.status
        complaint.updated_at = datetime.now(UTC)
        self.complaints.save(complaint)
        return self._read(complaint)

    def _accessible(self, complaint_id: uuid.UUID, actor: User) -> Complaint:
        complaint = self.complaints.get(complaint_id)
        if not complaint:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "complaint_not_found",
                "Reclamation introuvable.",
            )
        allowed = (
            actor.role == UserRole.ADMIN
            or (actor.role == UserRole.MEMBER and complaint.member_id == actor.id)
            or (
                actor.role == UserRole.RECEPTIONIST
                and complaint.assigned_role == UserRole.RECEPTIONIST.value
            )
        )
        if not allowed:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "complaint_access_forbidden",
                "Acces interdit a cette reclamation.",
            )
        return complaint

    def _read(self, complaint: Complaint) -> ComplaintRead:
        member = self.users.get(complaint.member_id)
        if not member:
            raise RuntimeError("Reclamation sans membre.")
        return ComplaintRead(
            id=complaint.id,
            member_id=complaint.member_id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            category=complaint.category,
            assigned_role=UserRole(complaint.assigned_role),
            subject=complaint.subject,
            status=complaint.status,
            created_at=complaint.created_at,
            updated_at=complaint.updated_at,
            messages=[
                ComplaintMessageRead.model_validate(message)
                for message in self.complaints.list_messages(complaint.id)
            ],
        )
