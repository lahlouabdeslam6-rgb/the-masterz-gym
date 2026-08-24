from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    COACH = "coach"
    MEMBER = "member"
    RECOVERY_CLIENT = "recovery_client"
    CAFE_EMPLOYEE = "cafe_employee"


class AccountStatus(StrEnum):
    PENDING_ACTIVATION = "pending_activation"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class Gender(StrEnum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"
    UNDISCLOSED = "undisclosed"


class OTPPurpose(StrEnum):
    PASSWORD_RESET = "password_reset"
    EXISTING_MEMBER_ACTIVATION = "existing_member_activation"


class ApplicationStatus(StrEnum):
    PENDING = "pending"
    MORE_INFORMATION_REQUIRED = "more_information_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONVERTED_TO_MEMBER = "converted_to_member"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    GRACE_PERIOD = "grace_period"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ServiceType(StrEnum):
    GYM = "gym"
    COACHING = "coaching"
    RECOVERY = "recovery"


class RecoveryService(StrEnum):
    SAUNA = "sauna"
    COLD_BATH = "cold_bath"
    COMPRESSION = "compression"


class ComplaintCategory(StrEnum):
    PAYMENT = "payment"
    SUBSCRIPTION = "subscription"
    ACCESS = "access"
    RESERVATION = "reservation"
    RECOVERY = "recovery"
    STORE = "store"
    COACHING = "coaching"
    ACCOUNT = "account"
    BEHAVIOR = "behavior"
    OTHER = "other"


class ComplaintStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class StoreReservationStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StorePaymentMethod(StrEnum):
    CASH = "cash"
    BANK_CARD = "bank_card"


class CoachingTestType(StrEnum):
    IMPEDANCE = "impedance"
    NEUROMUSCULAR = "neuromuscular"
    BODY_MEASUREMENTS = "body_measurements"
    RM_STRENGTH = "rm_strength"
    NUTRITION_SURVEY = "nutrition_survey"


class CoachingBookingStatus(StrEnum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class PaymentMethod(StrEnum):
    CASH = "cash"
    BANK_CARD = "bank_card"
    BANK_TRANSFER = "bank_transfer"


class AttendanceDecision(StrEnum):
    ALLOWED = "allowed"
    ALLOWED_WITH_WARNING = "allowed_with_warning"
    EXCEPTIONAL_ACCESS = "exceptional_access"
    DENIED = "denied"
