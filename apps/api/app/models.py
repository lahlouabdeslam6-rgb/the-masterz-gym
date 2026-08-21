"""Import all SQLAlchemy models so Alembic can discover their metadata."""

from app.modules.applications.models import MembershipApplication
from app.modules.attendance.models import Attendance
from app.modules.audit.models import AuditLog
from app.modules.auth.models import OTPChallenge, RefreshSession
from app.modules.coaching.models import (
    CoachingAssessment,
    CoachingClientProfile,
    CoachMemberAssignment,
)
from app.modules.memberships.models import (
    MembershipPlan,
    Subscription,
    SubscriptionEvent,
    SystemSetting,
)
from app.modules.payments.models import Payment, Receipt
from app.modules.recovery.models import RecoveryVisit
from app.modules.users.models import User

__all__ = [
    "Attendance",
    "AuditLog",
    "CoachMemberAssignment",
    "CoachingAssessment",
    "CoachingClientProfile",
    "MembershipApplication",
    "MembershipPlan",
    "OTPChallenge",
    "Payment",
    "Receipt",
    "RefreshSession",
    "RecoveryVisit",
    "Subscription",
    "SubscriptionEvent",
    "SystemSetting",
    "User",
]
