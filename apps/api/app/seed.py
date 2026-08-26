from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.memberships.models import MembershipPlan, SystemSetting
from app.modules.users.models import User
from app.shared.enums import AccountStatus, ServiceType, UserRole

DEVELOPMENT_ACCOUNTS = (
    {
        "full_name": "Administrateur Développement",
        "phone": "+212600000001",
        "password": "AdminLocal123!",
        "role": UserRole.ADMIN,
        "member_number": None,
    },
    {
        "full_name": "Réception Développement",
        "phone": "+212600000002",
        "password": "ReceptionLocal123!",
        "role": UserRole.RECEPTIONIST,
        "member_number": None,
    },
    {
        "full_name": "Membre Développement",
        "phone": "+212600000003",
        "password": "MemberLocal123!",
        "role": UserRole.MEMBER,
        "member_number": "TMG-DEV-0001",
    },
    {
        "full_name": "Coach Développement",
        "phone": "+212600000004",
        "password": "CoachLocal123!",
        "role": UserRole.COACH,
        "member_number": None,
    },
    {
        "full_name": "Recovery Développement",
        "phone": "+212600000005",
        "password": "RecoveryLocal123!",
        "role": UserRole.RECOVERY_CLIENT,
        "member_number": None,
    },
    {
        "full_name": "Café Développement",
        "phone": "+212600000006",
        "password": "CafeLocal123!",
        "role": UserRole.CAFE_EMPLOYEE,
        "member_number": None,
    },
)

DEMO_PLANS = (
    ("1 mois", 1, Decimal("300.00")),
    ("3 mois", 3, Decimal("800.00")),
    ("6 mois", 6, Decimal("1200.00")),
    ("12 mois", 12, Decimal("2000.00")),
)

DEFAULT_SETTINGS = {
    "subscription_grace_days": 4,
    "subscription_expiring_soon_days": 7,
    "attendance_duplicate_window_minutes": 30,
    "store_low_stock_threshold": 5,
    "application_pending_retention_days": 7,
}


def seed() -> None:
    with SessionLocal.begin() as session:
        for account in DEVELOPMENT_ACCOUNTS:
            user = session.scalar(select(User).where(User.phone == account["phone"]))
            if not user:
                session.add(
                    User(
                        full_name=account["full_name"],
                        phone=account["phone"],
                        password_hash=hash_password(account["password"]),
                        role=account["role"],
                        status=AccountStatus.ACTIVE,
                        member_number=account["member_number"],
                    )
                )
        for name, months, price in DEMO_PLANS:
            plan = session.scalar(
                select(MembershipPlan).where(
                    MembershipPlan.duration_months == months,
                    MembershipPlan.service_type == ServiceType.GYM,
                )
            )
            if not plan:
                session.add(
                    MembershipPlan(
                        name=name,
                        duration_months=months,
                        price=price,
                        currency="MAD",
                        service_type=ServiceType.GYM,
                        is_active=True,
                    )
                )
        for key, value in DEFAULT_SETTINGS.items():
            setting = session.scalar(select(SystemSetting).where(SystemSetting.key == key))
            if not setting:
                session.add(SystemSetting(key=key, value={"value": value}))


def main() -> None:
    seed()
    print("Données de développement Phase 2 créées ou déjà présentes.")


if __name__ == "__main__":
    main()
