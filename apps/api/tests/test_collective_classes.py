from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from conftest import role_headers
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.clubs.constants import SALLE_2_ID
from app.modules.clubs.repository import ClubRepository
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import AccountStatus, ServiceType, SubscriptionStatus, UserRole


def _member_with_salle_2_access(
    db_session: Session,
    *,
    full_name: str,
    phone: str,
    member_number: str,
    plan: MembershipPlan,
) -> User:
    member = User(
        full_name=full_name,
        phone=phone,
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=member_number,
    )
    db_session.add(member)
    db_session.flush()
    ClubRepository(db_session).ensure_assignment(member.id, SALLE_2_ID)
    today = date.today()
    db_session.add(
        Subscription(
            member_id=member.id,
            club_id=SALLE_2_ID,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            starts_on=today,
            ends_on=today + timedelta(days=365),
            grace_ends_on=today + timedelta(days=369),
            plan_name=plan.name,
            duration_months=plan.duration_months,
            price=plan.price,
            currency=plan.currency,
            service_type=ServiceType.GYM,
            created_by_id=member.id,
        )
    )
    db_session.flush()
    return member


def test_collective_class_capacity_waitlist_and_auto_promotion(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    coach = UserRepository(db_session).by_phone("+212600000004")
    assert coach is not None
    ClubRepository(db_session).ensure_assignment(coach.id, SALLE_2_ID)

    plan = MembershipPlan(
        name="Salle 2 annuel test",
        club_id=SALLE_2_ID,
        duration_months=12,
        price=Decimal("2400.00"),
        currency="MAD",
        service_type=ServiceType.GYM,
        is_active=True,
    )
    db_session.add(plan)
    db_session.flush()
    member_one = _member_with_salle_2_access(
        db_session,
        full_name="Membre Salle Deux A",
        phone="+212699100001",
        member_number="TMG-S2-TEST-A",
        plan=plan,
    )
    member_two = _member_with_salle_2_access(
        db_session,
        full_name="Membre Salle Deux B",
        phone="+212699100002",
        member_number="TMG-S2-TEST-B",
        plan=plan,
    )

    types_response = client.get(
        f"/api/v1/collective-classes/types?club_id={SALLE_2_ID}",
        headers=admin_headers,
    )
    assert types_response.status_code == 200, types_response.text
    class_type_id = types_response.json()[0]["id"]
    starts_at = datetime.now(UTC) + timedelta(days=2)
    session_response = client.post(
        "/api/v1/collective-classes/sessions",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "class_type_id": class_type_id,
            "coach_id": str(coach.id),
            "starts_at": starts_at.isoformat(),
            "duration_minutes": 60,
            "capacity": 1,
            "note": "Test liste attente",
        },
    )
    assert session_response.status_code == 201, session_response.text
    session_id = session_response.json()["id"]

    first_response = client.post(
        f"/api/v1/collective-classes/sessions/{session_id}/reservations",
        headers=role_headers(db_session, member_one.phone),
    )
    assert first_response.status_code == 201, first_response.text
    assert first_response.json()["status"] == "confirmed"

    second_response = client.post(
        f"/api/v1/collective-classes/sessions/{session_id}/reservations",
        headers=role_headers(db_session, member_two.phone),
    )
    assert second_response.status_code == 201, second_response.text
    assert second_response.json()["status"] == "waitlisted"
    assert second_response.json()["waitlist_position"] == 1

    cancel_response = client.patch(
        f"/api/v1/collective-classes/reservations/{first_response.json()['id']}/cancel",
        headers=role_headers(db_session, member_one.phone),
        json={"reason": "Je ne peux plus venir"},
    )
    assert cancel_response.status_code == 200, cancel_response.text
    assert cancel_response.json()["status"] == "cancelled"

    reservations_response = client.get(
        f"/api/v1/collective-classes/sessions/{session_id}/reservations",
        headers=admin_headers,
    )
    assert reservations_response.status_code == 200, reservations_response.text
    reservations = {item["member_id"]: item for item in reservations_response.json()}
    assert reservations[str(member_two.id)]["status"] == "confirmed"
    assert reservations[str(member_two.id)]["waitlist_position"] is None


def test_member_without_salle_2_access_cannot_list_sessions(
    client: TestClient,
    db_session: Session,
) -> None:
    member = UserRepository(db_session).by_phone("+212600000003")
    assert member is not None
    response = client.get(
        f"/api/v1/collective-classes/sessions?club_id={SALLE_2_ID}",
        headers=role_headers(db_session, member.phone),
    )
    assert response.status_code == 403, response.text
    assert response.json()["detail"]["code"] == "club_access_denied"
