import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.audit.models import AuditLog


class AuditRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, entry: AuditLog) -> AuditLog:
        self.session.add(entry)
        self.session.flush()
        return entry

    def list(self, *, limit: int = 100, actor_id: uuid.UUID | None = None) -> list[AuditLog]:
        statement = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        if actor_id:
            statement = statement.where(AuditLog.actor_id == actor_id)
        return list(self.session.scalars(statement))
