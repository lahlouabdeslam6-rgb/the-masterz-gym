import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_jwt
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.payments.models import Payment
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import (
    AccountStatus,
    PaymentMethod,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import add_months, local_today


def test_admin_dashboard_returns_consistent_live_metrics(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/admin/analytics/dashboard",
        headers=admin_headers,
        params={"months": 6},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["period_months"] == 6
    assert len(payload["monthly"]) == 6
    assert len(payload["service_revenue"]) == 4
    assert len(payload["payment_methods"]) == 3
    assert payload["metrics"]["member_count"] >= payload["metrics"]["active_member_count"]
    assert (
        sum(point["payments"] for point in payload["monthly"])
        == payload["metrics"]["payment_count"]
    )


def test_admin_dashboard_rejects_reception(client: TestClient, db_session: Session) -> None:
    reception = UserRepository(db_session).by_phone("+212600000002")
    assert reception is not None
    access_token = create_jwt(
        subject=reception.id,
        role=reception.role.value,
        token_type="access",
        lifetime=timedelta(minutes=5),
        session_id=uuid.uuid4(),
    )
    response = client.get(
        "/api/v1/admin/analytics/dashboard",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


def test_admin_dashboard_separates_exhausted_sessions_and_completed_services(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    before_response = client.get("/api/v1/admin/analytics/dashboard", headers=admin_headers)
    assert before_response.status_code == 200, before_response.text
    before = {
        item["status"]: item["count"] for item in before_response.json()["subscription_statuses"]
    }

    admin = UserRepository(db_session).by_phone("+212600000001")
    assert admin is not None
    suffix = uuid.uuid4().hex[:8]
    member = User(
        full_name="Membre Statuts Services",
        phone=f"+2128{suffix}",
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-STATUS-{suffix.upper()}",
    )
    recovery_plan = MembershipPlan(
        name=f"Recovery analytics {suffix}",
        duration_months=1,
        price=Decimal("200.00"),
        currency="MAD",
        service_type=ServiceType.RECOVERY,
        session_count=4,
        is_active=True,
    )
    coaching_plan = MembershipPlan(
        name=f"Coaching analytics {suffix}",
        duration_months=1,
        price=Decimal("300.00"),
        currency="MAD",
        service_type=ServiceType.COACHING,
        is_active=True,
    )
    db_session.add_all([member, recovery_plan, coaching_plan])
    db_session.flush()

    today = local_today()
    db_session.add_all(
        [
            Subscription(
                member_id=member.id,
                plan_id=recovery_plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=today - timedelta(days=5),
                ends_on=today + timedelta(days=1),
                grace_ends_on=today + timedelta(days=5),
                plan_name=recovery_plan.name,
                duration_months=1,
                price=recovery_plan.price,
                currency=recovery_plan.currency,
                service_type=ServiceType.RECOVERY,
                total_sessions=4,
                remaining_sessions=0,
                created_by_id=admin.id,
            ),
            Subscription(
                member_id=member.id,
                plan_id=coaching_plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=today - timedelta(days=32),
                ends_on=today - timedelta(days=1),
                grace_ends_on=today + timedelta(days=3),
                plan_name=coaching_plan.name,
                duration_months=1,
                price=coaching_plan.price,
                currency=coaching_plan.currency,
                service_type=ServiceType.COACHING,
                created_by_id=admin.id,
            ),
        ]
    )
    db_session.flush()

    response = client.get("/api/v1/admin/analytics/dashboard", headers=admin_headers)
    assert response.status_code == 200, response.text
    after = {item["status"]: item["count"] for item in response.json()["subscription_statuses"]}

    assert after["sessions_exhausted"] == before["sessions_exhausted"] + 1
    assert after["service_completed"] == before["service_completed"] + 1
    assert after["expired"] == before["expired"]
    assert after["expiring_soon"] == before["expiring_soon"]


def test_cancelled_subscription_payment_is_excluded_from_analytics(
    db_session: Session,
) -> None:
    admin = UserRepository(db_session).by_phone("+212600000001")
    assert admin is not None
    suffix = uuid.uuid4().hex[:8]
    member = User(
        full_name="Membre Analytics",
        phone=f"+2127{suffix}",
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-ANALYTICS-{suffix.upper()}",
    )
    plan = MembershipPlan(
        name="Test analytics",
        duration_months=1,
        price=Decimal("100.00"),
        currency="MAD",
        service_type=ServiceType.GYM,
        is_active=True,
    )
    db_session.add_all([member, plan])
    db_session.flush()

    today = local_today()
    subscriptions = [
        Subscription(
            member_id=member.id,
            plan_id=plan.id,
            status=status,
            starts_on=today,
            ends_on=add_months(today, 1) - timedelta(days=1),
            grace_ends_on=add_months(today, 1) + timedelta(days=3),
            plan_name=plan.name,
            duration_months=plan.duration_months,
            price=plan.price,
            currency=plan.currency,
            service_type=plan.service_type,
            created_by_id=admin.id,
        )
        for status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED)
    ]
    db_session.add_all(subscriptions)
    db_session.flush()
    payments = [
        Payment(
            idempotency_key=f"analytics-{status.value}-{suffix}",
            member_id=member.id,
            subscription_id=subscription.id,
            amount=Decimal("100.00"),
            currency="MAD",
            method=PaymentMethod.CASH,
            recorded_by_id=admin.id,
        )
        for status, subscription in zip(
            (SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED),
            subscriptions,
            strict=True,
        )
    ]
    db_session.add_all(payments)
    db_session.flush()

    listed = AnalyticsRepository(db_session).list_payments_since(
        datetime.now(UTC) - timedelta(minutes=1)
    )
    listed_payment_ids = {payment.id for payment, _ in listed}

    assert payments[0].id in listed_payment_ids
    assert payments[1].id not in listed_payment_ids
