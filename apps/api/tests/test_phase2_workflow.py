import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.auth.otp import OTPProvider
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.users.models import User
from app.shared.enums import AccountStatus, SubscriptionStatus, UserRole
from app.shared.time import add_months, local_today


def test_login_rejects_invalid_credentials_without_disclosing_account(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"phone": "+212600000001", "password": "incorrect-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_unknown_password_reset_is_generic(client: TestClient) -> None:
    response = client.post("/api/v1/auth/password-reset/request", json={"phone": "+212699999999"})
    assert response.status_code == 202
    assert response.json()["message"] == "Si les informations correspondent, un code a été envoyé."
    assert response.json()["challenge_id"]


def test_existing_member_activation_uses_otp_and_enables_login(
    client: TestClient,
    db_session: Session,
    otp_provider: OTPProvider,
) -> None:
    phone = f"+21266{uuid.uuid4().int % 100_000_000:08d}"
    member = User(
        full_name="Membre Activation Test",
        phone=phone,
        password_hash=None,
        role=UserRole.MEMBER,
        status=AccountStatus.PENDING_ACTIVATION,
        member_number=f"TMG-ACT-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()

    requested = client.post(
        "/api/v1/auth/member-activation/request",
        json={
            "phone": phone,
            "full_name": member.full_name,
            "member_number": member.member_number,
        },
    )
    assert requested.status_code == 202
    code = otp_provider.codes[phone]  # type: ignore[attr-defined]

    confirmed = client.post(
        "/api/v1/auth/member-activation/confirm",
        json={
            "challenge_id": requested.json()["challenge_id"],
            "otp": code,
            "new_password": "ActivatedLocal123!",
        },
    )
    assert confirmed.status_code == 200

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "ActivatedLocal123!"},
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["user"]["status"] == "active"


def test_reception_cannot_create_membership_plan(
    client: TestClient, reception_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/membership-plans",
        headers=reception_headers,
        json={
            "name": "Interdite",
            "duration_months": 2,
            "price": "500.00",
            "currency": "MAD",
            "is_active": True,
        },
    )
    assert response.status_code == 403


def test_future_subscription_does_not_allow_early_attendance(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
) -> None:
    member = db_session.query(User).filter(User.phone == "+212600000003").one()
    receptionist = db_session.query(User).filter(User.phone == "+212600000002").one()
    plan = db_session.query(MembershipPlan).filter(MembershipPlan.duration_months == 1).one()
    starts_on = local_today() + timedelta(days=10)
    ends_on = add_months(starts_on, plan.duration_months) - timedelta(days=1)
    db_session.add(
        Subscription(
            member_id=member.id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            starts_on=starts_on,
            ends_on=ends_on,
            grace_ends_on=ends_on + timedelta(days=4),
            plan_name=plan.name,
            duration_months=plan.duration_months,
            price=plan.price,
            currency=plan.currency,
            created_by_id=receptionist.id,
        )
    )
    db_session.flush()

    response = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": str(member.id)},
    )
    assert response.status_code == 201
    assert response.json()["decision"] == "denied"


def test_application_payment_attendance_and_audit_workflow(
    client: TestClient,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    plans = client.get("/api/v1/membership-plans").json()
    plan = next(item for item in plans if item["duration_months"] == 1)
    phone = f"+21267{uuid.uuid4().int % 100_000_000:08d}"

    submitted = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Membre Test Phase Deux",
            "phone": phone,
            "email": "phase2@example.com",
            "selected_plan_id": plan["id"],
            "fitness_objective": "Améliorer la condition physique générale",
        },
    )
    assert submitted.status_code == 201, submitted.text
    application_id = submitted.json()["id"]
    assert submitted.json()["status"] == "pending"

    approved = client.patch(
        f"/api/v1/membership-applications/{application_id}/review",
        headers=reception_headers,
        json={"status": "approved"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"

    users_before_payment = client.get("/api/v1/users", headers=admin_headers).json()
    assert all(user["phone"] != phone for user in users_before_payment)

    idempotency_key = f"phase2-test-{uuid.uuid4()}"
    payment_payload = {
        "idempotency_key": idempotency_key,
        "application_id": application_id,
        "method": "cash",
    }
    paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json=payment_payload,
    )
    assert paid.status_code == 201, paid.text
    receipt = paid.json()
    assert receipt["amount"] == "300.00"
    assert receipt["currency"] == "MAD"
    assert receipt["receipt_number"].startswith("TMG-")

    duplicate = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json=payment_payload,
    )
    assert duplicate.status_code == 201, duplicate.text
    assert duplicate.json()["payment_id"] == receipt["payment_id"]

    users_after_payment = client.get("/api/v1/users", headers=admin_headers).json()
    member = next(user for user in users_after_payment if user["phone"] == phone)
    assert member["status"] == "pending_activation"
    assert member["member_number"].startswith("TMG-")

    subscriptions = client.get(
        f"/api/v1/members/{member['id']}/subscriptions", headers=reception_headers
    )
    assert subscriptions.status_code == 200
    assert len(subscriptions.json()) == 1

    check_in = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": member["id"]},
    )
    assert check_in.status_code == 201, check_in.text
    assert check_in.json()["decision"] == "allowed"

    duplicate_attendance = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": member["id"]},
    )
    assert duplicate_attendance.status_code == 409
    assert duplicate_attendance.json()["detail"]["code"] == "duplicate_attendance"

    audit_logs = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_logs.status_code == 200
    actions = {entry["action"] for entry in audit_logs.json()}
    assert "application.approved" in actions
    assert "payment.recorded" in actions
    assert "subscription.created" in actions
