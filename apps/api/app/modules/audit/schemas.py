import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.shared.enums import UserRole


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_role: UserRole | None
    action: str
    entity_type: str
    entity_id: str
    previous_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    reason: str | None
    created_at: datetime
