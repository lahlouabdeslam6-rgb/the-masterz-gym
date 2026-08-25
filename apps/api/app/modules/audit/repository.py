from __future__ import annotations

import uuid
from collections.abc import Collection

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

    def list(
        self,
        *,
        limit: int = 100,
        actor_id: uuid.UUID | None = None,
        business_only: bool = False,
    ) -> list[AuditLog]:
        statement = select(AuditLog).order_by(AuditLog.created_at.desc())
        if actor_id:
            statement = statement.where(AuditLog.actor_id == actor_id)
        if business_only:
            statement = statement.where(~AuditLog.action.startswith("auth."))
        return list(self.session.scalars(statement.limit(limit)))

    def list_actions(self, actions: Collection[str], *, limit: int = 100) -> list[AuditLog]:
        if not actions:
            return []
        statement = (
            select(AuditLog)
            .where(AuditLog.action.in_(tuple(actions)))
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        return list(self.session.scalars(statement))
