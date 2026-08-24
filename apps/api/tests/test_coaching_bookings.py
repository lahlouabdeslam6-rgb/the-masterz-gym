import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.coaching.models import CoachMemberAssignment
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.users.models import User
from app.shared.enums import (
    AccountStatus,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import add_months, local_today


def _login(client: TestClient, phone: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_coaching_booking_conflict_can_be_explicitly_overridden(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    suffix = str(uuid.uuid4().int)[-7:]
    coach_password = "CoachPlanning123!"
    member_password = "MemberPlanning123!"
    coach = User(
        full_name="Coach Planning",
        phone=f"+21263{suffix}",
        email=f"coach-{suffix}@example.com",
        password_hash=hash_password(coach_password),
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
        member_number=None,
    )
    members = [
        User(
            full_name=f"Membre Planning {index}",
            phone=f"+2126{index + 3}{suffix}",
            email=f"member-{index}-{suffix}@example.com",
            password_hash=hash_password(member_password),
            role=UserRole.MEMBER,
            status=AccountStatus.ACTIVE,
            member_number=f"TMG-PLAN-{index}-{suffix}",
        )
        for index in (1, 2)
    ]
    plan = MembershipPlan(
        name=f"Coaching Planning {suffix}",
        duration_months=3,
        price=Decimal("900.00"),
        currency="MAD",
        service_type=ServiceType.COACHING,
        session_count=None,
        is_active=True,
    )
    db_session.add_all([coach, *members, plan])
    db_session.flush()

    today = local_today()
    admin = db_session.query(User).filter(User.phone == "+212600000001").one()
    for member in members:
        db_session.add(
            Subscription(
                member_id=member.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=today,
                ends_on=add_months(today, plan.duration_months) - timedelta(days=1),
                grace_ends_on=add_months(today, plan.duration_months) + timedelta(days=3),
                plan_name=plan.name,
                duration_months=plan.duration_months,
                price=plan.price,
                currency=plan.currency,
                service_type=ServiceType.COACHING,
                total_sessions=None,
                remaining_sessions=None,
                created_by_id=admin.id,
            )
        )
        db_session.add(
            CoachMemberAssignment(
                coach_id=coach.id,
                member_id=member.id,
                assigned_by_id=admin.id,
                started_at=datetime.now(UTC),
                ended_at=None,
                reason="Test planning coaching",
            )
        )
    db_session.flush()

    coach_headers = _login(client, coach.phone, coach_password)
    member_headers = [_login(client, member.phone, member_password) for member in members]
    base_start = (datetime.now(UTC) + timedelta(days=2)).replace(
        hour=9,
        minute=0,
        second=0,
        microsecond=0,
    )
    periods = [
        (base_start, base_start + timedelta(hours=1)),
        (base_start + timedelta(minutes=30), base_start + timedelta(hours=1, minutes=30)),
        (base_start + timedelta(hours=2), base_start + timedelta(hours=3)),
    ]
    availabilities = []
    for index, (starts_at, ends_at) in enumerate(periods, start=1):
        created = client.post(
            "/api/v1/coaching/availability",
            headers=coach_headers,
            json={
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "note": f"Creneau {index}",
            },
        )
        assert created.status_code == 201, created.text
        availabilities.append(created.json())

    member_slots = client.get(
        "/api/v1/coaching/availability",
        headers=member_headers[0],
    )
    assert member_slots.status_code == 200, member_slots.text
    assert {item["id"] for item in member_slots.json()} >= {item["id"] for item in availabilities}

    bookings = []
    for index, availability_index in enumerate((0, 1)):
        requested = client.post(
            "/api/v1/coaching/bookings",
            headers=member_headers[index],
            json={
                "availability_id": availabilities[availability_index]["id"],
                "member_note": f"Reservation membre {index + 1}",
            },
        )
        assert requested.status_code == 201, requested.text
        assert requested.json()["status"] == "requested"
        bookings.append(requested.json())

    first_confirmed = client.patch(
        f"/api/v1/coaching/bookings/{bookings[0]['id']}/status",
        headers=coach_headers,
        json={"status": "confirmed", "decision_note": "Confirme par le coach"},
    )
    assert first_confirmed.status_code == 200, first_confirmed.text

    conflict = client.patch(
        f"/api/v1/coaching/bookings/{bookings[1]['id']}/status",
        headers=reception_headers,
        json={"status": "confirmed", "decision_note": "Validation reception"},
    )
    assert conflict.status_code == 409, conflict.text
    assert conflict.json()["detail"]["code"] == "coaching_booking_overlap"
    assert (
        conflict.json()["detail"]["details"]["conflicts"][0]["member_name"] == members[0].full_name
    )

    override = client.patch(
        f"/api/v1/coaching/bookings/{bookings[1]['id']}/status",
        headers=reception_headers,
        json={
            "status": "confirmed",
            "decision_note": "Deux seances maintenues avec accord",
            "confirm_overlap": True,
        },
    )
    assert override.status_code == 200, override.text
    assert override.json()["status"] == "confirmed"
    assert override.json()["conflict_override"] is True
    assert override.json()["overlapping_confirmed_count"] == 1

    rescheduled = client.patch(
        f"/api/v1/coaching/bookings/{bookings[1]['id']}/schedule",
        headers=admin_headers,
        json={
            "availability_id": availabilities[2]["id"],
            "decision_note": "Creneau separe par lAdmin",
        },
    )
    assert rescheduled.status_code == 200, rescheduled.text
    assert rescheduled.json()["starts_at"] == availabilities[2]["starts_at"]
    assert rescheduled.json()["conflict_override"] is False

    blocked_availability_update = client.patch(
        f"/api/v1/coaching/availability/{availabilities[0]['id']}",
        headers=coach_headers,
        json={
            "starts_at": availabilities[0]["starts_at"],
            "ends_at": availabilities[0]["ends_at"],
            "note": "Fermeture impossible",
            "is_active": False,
        },
    )
    assert blocked_availability_update.status_code == 409
    assert blocked_availability_update.json()["detail"]["code"] == "availability_has_bookings"

    member_cannot_confirm = client.patch(
        f"/api/v1/coaching/bookings/{bookings[0]['id']}/status",
        headers=member_headers[0],
        json={"status": "completed"},
    )
    assert member_cannot_confirm.status_code == 403

    member_cancel = client.patch(
        f"/api/v1/coaching/bookings/{bookings[0]['id']}/status",
        headers=member_headers[0],
        json={"status": "cancelled", "decision_note": "Indisponible"},
    )
    assert member_cancel.status_code == 200, member_cancel.text
    assert member_cancel.json()["status"] == "cancelled"

    staff_bookings = client.get("/api/v1/coaching/bookings", headers=reception_headers)
    assert staff_bookings.status_code == 200
    assert {item["id"] for item in staff_bookings.json()} >= {item["id"] for item in bookings}

    member_notifications = client.get("/api/v1/notifications", headers=member_headers[1])
    assert member_notifications.status_code == 200
    titles = {item["title"] for item in member_notifications.json()}
    assert "Seance coaching confirmee" in titles
    assert "Horaire de seance modifie" in titles

    coach_notifications = client.get("/api/v1/notifications", headers=coach_headers)
    assert coach_notifications.status_code == 200
    assert "Nouvelle reservation coaching" in {item["title"] for item in coach_notifications.json()}

    audit = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()}
    assert {
        "coaching.availability_created",
        "coaching.booking_requested",
        "coaching.booking_status_updated",
        "coaching.booking_rescheduled",
    } <= actions
