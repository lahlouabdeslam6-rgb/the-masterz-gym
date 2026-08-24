"""Import all SQLAlchemy models so Alembic can discover their metadata."""

from app.modules.applications.models import MembershipApplication
from app.modules.attendance.models import Attendance
from app.modules.audit.models import AuditLog
from app.modules.auth.models import OTPChallenge, RefreshSession
from app.modules.coaching.models import (
    CoachAvailability,
    CoachingAssessment,
    CoachingBooking,
    CoachingClientProfile,
    CoachMemberAssignment,
)
from app.modules.complaints.models import Complaint, ComplaintMessage
from app.modules.memberships.models import (
    MembershipPlan,
    Subscription,
    SubscriptionEvent,
    SystemSetting,
)
from app.modules.notifications.models import Notification
from app.modules.payments.models import Payment, Receipt
from app.modules.recovery.models import RecoveryVisit
from app.modules.store.models import StoreProduct, StoreReservation, StoreSale
from app.modules.users.models import User

__all__ = [
    "Attendance",
    "AuditLog",
    "CoachAvailability",
    "CoachMemberAssignment",
    "CoachingAssessment",
    "CoachingBooking",
    "CoachingClientProfile",
    "Complaint",
    "ComplaintMessage",
    "MembershipApplication",
    "MembershipPlan",
    "Notification",
    "OTPChallenge",
    "Payment",
    "Receipt",
    "RefreshSession",
    "RecoveryVisit",
    "Subscription",
    "SubscriptionEvent",
    "SystemSetting",
    "StoreProduct",
    "StoreReservation",
    "StoreSale",
    "User",
]
