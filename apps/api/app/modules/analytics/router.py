from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DbSession, require_roles
from app.modules.analytics.schemas import AdminDashboardRead
from app.modules.analytics.service import AnalyticsService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/admin/analytics", tags=["Admin analytics"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/dashboard", response_model=AdminDashboardRead)
def get_admin_dashboard(
    session: DbSession,
    actor: Admin,
    months: Annotated[int, Query(ge=3, le=24)] = 6,
):
    return AnalyticsService(session).dashboard(months)
