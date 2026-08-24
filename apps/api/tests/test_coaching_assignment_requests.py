import uuid
from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.users.models import User
from app.shared.enums import AccountStatus, ServiceType, SubscriptionStatus, UserRole
from app.shared.time import add_months, local_today


def _login(client: TestClient, phone: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": password},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_member_requests_a_coach_and_reception_approves_atomically(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    suffix = f"{uuid.uuid4().int % 1_000_000:06d}"
    coach_password = "CoachChoice123!"
    member_password = "MemberChoice123!"
    coaches = [
        User(
            full_name=f"Coach Choice {index}",
            phone=f"+21267{index}{suffix}",
            email=f"coach-choice-{index}-{suffix}@example.com",
            password_hash=hash_password(coach_password),
            role=UserRole.COACH,
            status=AccountStatus.ACTIVE,
            member_number=None,
        )
        for index in (1, 2)
    ]
    members = [
        User(
            full_name=f"Membre Choice {index}",
            phone=f"+21268{index}{suffix}",
            email=f"member-choice-{index}-{suffix}@example.com",
            password_hash=hash_password(member_password),
            role=UserRole.MEMBER,
            status=AccountStatus.ACTIVE,
            member_number=f"TMG-CHOICE-{index}-{suffix.upper()}",
        )
        for index in (1, 2, 3)
    ]
    plan = MembershipPlan(
        name=f"Coaching Choice {suffix}",
        duration_months=3,
        price=Decimal("900.00"),
        currency="MAD",
        service_type=ServiceType.COACHING,
        session_count=None,
        is_active=True,
    )
    db_session.add_all([*coaches, *members, plan])
    db_session.flush()

    today = local_today()
    admin = db_session.query(User).filter(User.phone == "+212600000001").one()
    for member in members[:2]:
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
    db_session.flush()

    member_headers = [_login(client, member.phone, member_password) for member in members]
    coach_headers = _login(client, coaches[0].phone, coach_password)

    directory = client.get(
        "/api/v1/coaching/directory",
        headers=member_headers[0],
    )
    assert directory.status_code == 200, directory.text
    assert {item["id"] for item in directory.json()} >= {str(coach.id) for coach in coaches}
    assert "phone" not in directory.json()[0]

    blocked_without_subscription = client.post(
        "/api/v1/coaching/assignment-requests",
        headers=member_headers[2],
        json={"preferred_coach_id": str(coaches[0].id)},
    )
    assert blocked_without_subscription.status_code == 409
    assert (
        blocked_without_subscription.json()["detail"]["code"]
        == "active_coaching_subscription_required"
    )

    requested = client.post(
        "/api/v1/coaching/assignment-requests",
        headers=member_headers[0],
        json={
            "preferred_coach_id": str(coaches[0].id),
            "member_note": "Je prefere ce coach",
        },
    )
    assert requested.status_code == 201, requested.text
    assert requested.json()["status"] == "pending"
    assert requested.json()["preferred_coach_name"] == coaches[0].full_name

    duplicate = client.post(
        "/api/v1/coaching/assignment-requests",
        headers=member_headers[0],
        json={"preferred_coach_id": str(coaches[1].id)},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "coaching_assignment_request_pending"

    staff_requests = client.get(
        "/api/v1/coaching/assignment-requests",
        headers=reception_headers,
        params={"request_status": "pending"},
    )
    assert staff_requests.status_code == 200, staff_requests.text
    assert requested.json()["id"] in {item["id"] for item in staff_requests.json()}

    approved = client.patch(
        f"/api/v1/coaching/assignment-requests/{requested.json()['id']}/decision",
        headers=reception_headers,
        json={
            "status": "approved",
            "decision_note": "Choix du membre confirme",
        },
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert approved.json()["assigned_coach_id"] == str(coaches[0].id)

    my_assignment = client.get(
        "/api/v1/coaching/my-assignment",
        headers=member_headers[0],
    )
    assert my_assignment.status_code == 200, my_assignment.text
    assert my_assignment.json()["coach_id"] == str(coaches[0].id)

    coach_members = client.get(
        "/api/v1/coaching/my-members",
        headers=coach_headers,
    )
    assert coach_members.status_code == 200, coach_members.text
    assert str(members[0].id) in {item["member_id"] for item in coach_members.json()}

    member_notifications = client.get(
        "/api/v1/notifications",
        headers=member_headers[0],
    )
    assert member_notifications.status_code == 200
    assert "Votre coach est confirme" in {item["title"] for item in member_notifications.json()}
    coach_notifications = client.get(
        "/api/v1/notifications",
        headers=coach_headers,
    )
    assert coach_notifications.status_code == 200
    assert "Nouveau client coaching" in {item["title"] for item in coach_notifications.json()}

    without_preference = client.post(
        "/api/v1/coaching/assignment-requests",
        headers=member_headers[1],
        json={"member_note": "La Reception peut choisir"},
    )
    assert without_preference.status_code == 201, without_preference.text
    missing_coach = client.patch(
        f"/api/v1/coaching/assignment-requests/{without_preference.json()['id']}/decision",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert missing_coach.status_code == 422
    assert missing_coach.json()["detail"]["code"] == "coach_required"

    staff_choice = client.patch(
        f"/api/v1/coaching/assignment-requests/{without_preference.json()['id']}/decision",
        headers=admin_headers,
        json={
            "status": "approved",
            "coach_id": str(coaches[1].id),
            "decision_note": "Coach choisi par la Reception",
        },
    )
    assert staff_choice.status_code == 200, staff_choice.text
    assert staff_choice.json()["assigned_coach_id"] == str(coaches[1].id)

    audit = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()}
    assert {
        "coaching.assignment_requested",
        "coaching.assignment_request_decided",
        "coaching.member_assigned",
    } <= actions
