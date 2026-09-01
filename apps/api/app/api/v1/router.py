from fastapi import APIRouter

from app.modules.analytics.router import router as analytics_router
from app.modules.applications.router import router as applications_router
from app.modules.attendance.router import router as attendance_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.cafe.router import router as cafe_router
from app.modules.clubs.router import router as clubs_router
from app.modules.coaching.router import router as coaching_router
from app.modules.collective_classes.router import router as collective_classes_router
from app.modules.complaints.router import router as complaints_router
from app.modules.health.router import router as health_router
from app.modules.memberships.router import router as memberships_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payments.router import router as payments_router
from app.modules.promotions.router import router as promotions_router
from app.modules.recovery.router import router as recovery_router
from app.modules.store.router import router as store_router
from app.modules.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(analytics_router)
api_router.include_router(auth_router)
api_router.include_router(cafe_router)
api_router.include_router(clubs_router)
api_router.include_router(users_router)
api_router.include_router(applications_router)
api_router.include_router(memberships_router)
api_router.include_router(promotions_router)
api_router.include_router(payments_router)
api_router.include_router(attendance_router)
api_router.include_router(coaching_router)
api_router.include_router(collective_classes_router)
api_router.include_router(complaints_router)
api_router.include_router(recovery_router)
api_router.include_router(notifications_router)
api_router.include_router(store_router)
api_router.include_router(audit_router)
