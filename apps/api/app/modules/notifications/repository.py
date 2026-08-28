import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification


class NotificationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, notification: Notification) -> Notification:
        self.session.add(notification)
        self.session.flush()
        return notification

    def save(self, notification: Notification) -> Notification:
        self.session.add(notification)
        self.session.flush()
        return notification

    def by_deduplication_key(self, key: str) -> Notification | None:
        return self.session.scalar(
            select(Notification).where(Notification.deduplication_key == key)
        )

    def list_for_user(
        self, user_id: uuid.UUID, *, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        statement = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            statement = statement.where(Notification.read_at.is_(None))
        return list(self.session.scalars(statement))

    def get_for_user(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification | None:
        return self.session.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )

    def mark_all_read(self, user_id: uuid.UUID, read_at: datetime) -> int:
        result = self.session.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=read_at)
        )
        self.session.flush()
        return result.rowcount or 0
