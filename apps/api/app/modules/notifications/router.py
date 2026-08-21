import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession
from app.modules.notifications.schemas import NotificationRead
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    session: DbSession,
    actor: CurrentUser,
    unread_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return NotificationService(session).list_for_user(actor, unread_only=unread_only, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(notification_id: uuid.UUID, session: DbSession, actor: CurrentUser):
    return NotificationService(session).mark_read(notification_id, actor)
