import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.memberships.models import Subscription
from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository
from app.modules.users.models import User


class NotificationService:
    def __init__(self, session: Session) -> None:
        self.repository = NotificationRepository(session)

    def list_for_user(
        self, user: User, *, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        return self.repository.list_for_user(user.id, unread_only=unread_only, limit=limit)

    def mark_read(self, notification_id: uuid.UUID, user: User) -> Notification:
        notification = self.repository.get_for_user(notification_id, user.id)
        if not notification:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "notification_not_found",
                "Notification introuvable.",
            )
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
        return self.repository.save(notification)

    def recovery_pack_exhausted(self, member: User, subscription: Subscription) -> Notification:
        deduplication_key = f"recovery_pack_exhausted:{subscription.id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="recovery_pack_exhausted",
                title="Vos seances Recovery sont terminees",
                body=(
                    f"Vous avez utilise la derniere seance de votre pack "
                    f"{subscription.plan_name}. Contactez la reception pour le renouveler."
                ),
                deduplication_key=deduplication_key,
            )
        )

    def complaint_reply(
        self,
        member: User,
        *,
        complaint_id: uuid.UUID,
        message_id: uuid.UUID,
        subject: str,
    ) -> Notification:
        deduplication_key = f"complaint_reply:{message_id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="complaint_reply",
                title="Nouvelle reponse a votre reclamation",
                body=(
                    f"L'equipe Masterz a repondu a votre reclamation: {subject}. "
                    "Ouvrez votre espace membre pour consulter la conversation."
                ),
                deduplication_key=deduplication_key,
            )
        )
