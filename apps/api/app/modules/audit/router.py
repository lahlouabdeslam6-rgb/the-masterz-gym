import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DbSession, require_roles
from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditLogRead
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/audit-logs", tags=["Audit logs"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    session: DbSession,
    actor: Admin,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    actor_id: uuid.UUID | None = None,
    business_only: bool = False,
):
    return AuditRepository(session).list(
        limit=limit,
        actor_id=actor_id,
        business_only=business_only,
    )
