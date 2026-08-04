import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.modules.audit.models import AuditLog
from app.modules.audit.repository import AuditRepository
from app.modules.users.models import User


class AuditService:
    def __init__(self, session: Session) -> None:
        self.repository = AuditRepository(session)

    def record(
        self,
        *,
        actor: User | None,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID | str,
        previous_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        reason: str | None = None,
    ) -> AuditLog:
        return self.repository.add(
            AuditLog(
                actor_id=actor.id if actor else None,
                actor_role=actor.role if actor else None,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                previous_value=previous_value,
                new_value=new_value,
                reason=reason,
            )
        )
