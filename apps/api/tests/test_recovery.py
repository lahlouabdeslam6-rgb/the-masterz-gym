import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User
from app.shared.enums import AccountStatus, UserRole
from app.shared.time import local_today


def test_recovery_pack_consumes_one_session_and_can_be_renewed_when_exhausted(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    invalid_plan = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "name": "Recovery incomplet",
            "duration_months": 1,
            "price": "500.00",
            "currency": "MAD",
            "service_type": "recovery",
            "is_active": True,
        },
    )
    assert invalid_plan.status_code == 422

    plan = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "name": "Recovery 2 seances",
            "duration_months": 2,
            "price": "600.00",
            "currency": "MAD",
            "service_type": "recovery",
            "session_count": 2,
            "is_active": True,
        },
    )
    assert plan.status_code == 201, plan.text
    assert plan.json()["session_count"] == 2

    password = "RecoveryMember123!"
    member = User(
        full_name="Membre Pack Recovery",
        phone=f"+21268{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-REC-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()

    chosen_start = local_today() - timedelta(days=1)
    paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"recovery-payment-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": plan.json()["id"],
            "starts_on": chosen_start.isoformat(),
            "method": "cash",
        },
    )
    assert paid.status_code == 201, paid.text
    assert paid.json()["starts_on"] == chosen_start.isoformat()
    assert paid.json()["total_sessions"] == 2
    assert paid.json()["remaining_sessions"] == 2

    clients = client.get("/api/v1/recovery/clients", headers=reception_headers)
    assert clients.status_code == 200, clients.text
    recovery_client = next(item for item in clients.json() if item["member_id"] == str(member.id))
    assert recovery_client["subscription"]["remaining_sessions"] == 2

    first_key = f"recovery-visit-{uuid.uuid4()}"
    first_payload = {
        "idempotency_key": first_key,
        "member_id": str(member.id),
        "occurred_at": datetime.now(UTC).isoformat(),
        "services": ["sauna", "cold_bath", "compression"],
        "notes": "Parcours recovery complet",
    }
    first = client.post(
        "/api/v1/recovery/visits",
        headers=reception_headers,
        json=first_payload,
    )
    assert first.status_code == 201, first.text
    assert first.json()["remaining_sessions_after"] == 1
    assert set(first.json()["services"]) == {"sauna", "cold_bath", "compression"}

    duplicate = client.post(
        "/api/v1/recovery/visits",
        headers=reception_headers,
        json=first_payload,
    )
    assert duplicate.status_code == 201, duplicate.text
    assert duplicate.json()["id"] == first.json()["id"]
    assert duplicate.json()["remaining_sessions_after"] == 1

    second = client.post(
        "/api/v1/recovery/visits",
        headers=admin_headers,
        json={
            **first_payload,
            "idempotency_key": f"recovery-visit-{uuid.uuid4()}",
            "services": ["sauna"],
        },
    )
    assert second.status_code == 201, second.text
    assert second.json()["remaining_sessions_after"] == 0

    exhausted = client.post(
        "/api/v1/recovery/visits",
        headers=reception_headers,
        json={
            **first_payload,
            "idempotency_key": f"recovery-visit-{uuid.uuid4()}",
        },
    )
    assert exhausted.status_code == 409
    assert exhausted.json()["detail"]["code"] == "usable_recovery_pack_required"

    member_login = client.post(
        "/api/v1/auth/login",
        json={"phone": member.phone, "password": password},
    )
    assert member_login.status_code == 200, member_login.text
    member_headers = {"Authorization": f"Bearer {member_login.json()['access_token']}"}
    notifications = client.get("/api/v1/notifications", headers=member_headers)
    assert notifications.status_code == 200, notifications.text
    assert len(notifications.json()) == 1
    notification = notifications.json()[0]
    assert notification["kind"] == "recovery_pack_exhausted"
    assert notification["read_at"] is None
    assert "derniere seance" in notification["body"]

    marked_read = client.patch(
        f"/api/v1/notifications/{notification['id']}/read", headers=member_headers
    )
    assert marked_read.status_code == 200, marked_read.text
    assert marked_read.json()["read_at"] is not None
    unread = client.get("/api/v1/notifications?unread_only=true", headers=member_headers)
    assert unread.status_code == 200, unread.text
    assert unread.json() == []

    tracking = client.get(f"/api/v1/recovery/members/{member.id}", headers=member_headers)
    assert tracking.status_code == 200, tracking.text
    assert tracking.json()["subscriptions"][0]["remaining_sessions"] == 0
    assert len(tracking.json()["visits"]) == 2

    next_start = local_today() + timedelta(days=10)
    renewed = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"recovery-renewal-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": plan.json()["id"],
            "starts_on": next_start.isoformat(),
            "method": "bank_card",
        },
    )
    assert renewed.status_code == 201, renewed.text
    assert renewed.json()["starts_on"] == next_start.isoformat()
    assert renewed.json()["remaining_sessions"] == 2
