import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.modules.clubs.constants import SALLE_1_ID, SALLE_2_ID
from app.modules.memberships.schemas import MembershipPlanCreate
from app.modules.users.repository import UserRepository
from app.shared.enums import ServiceType


def test_public_club_directory_lists_both_rooms(client: TestClient) -> None:
    response = client.get("/api/v1/clubs")
    assert response.status_code == 200, response.text
    clubs = response.json()
    assert [(club["id"], club["label"]) for club in clubs] == [
        (str(SALLE_1_ID), "Salle 1"),
        (str(SALLE_2_ID), "Salle 2"),
    ]


def test_reception_is_scoped_to_salle_1(
    client: TestClient, reception_headers: dict[str, str]
) -> None:
    response = client.get("/api/v1/clubs/my-access", headers=reception_headers)
    assert response.status_code == 200, response.text
    assert [club["id"] for club in response.json()["clubs"]] == [str(SALLE_1_ID)]


def test_admin_can_assign_coach_to_both_rooms(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    coach = UserRepository(db_session).by_phone("+212600000004")
    assert coach is not None
    response = client.put(
        f"/api/v1/clubs/users/{coach.id}/assignments",
        headers=admin_headers,
        json={
            "club_ids": [str(SALLE_1_ID), str(SALLE_2_ID)],
            "reason": "Coach disponible dans les deux salles",
        },
    )
    assert response.status_code == 200, response.text
    assert {assignment["club_id"] for assignment in response.json()} == {
        str(SALLE_1_ID),
        str(SALLE_2_ID),
    }


def test_reception_must_belong_to_exactly_one_room(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    reception = UserRepository(db_session).by_phone("+212600000002")
    assert reception is not None
    response = client.put(
        f"/api/v1/clubs/users/{reception.id}/assignments",
        headers=admin_headers,
        json={
            "club_ids": [str(SALLE_1_ID), str(SALLE_2_ID)],
            "reason": "Verification du perimetre de la Reception",
        },
    )
    assert response.status_code == 422, response.text
    assert response.json()["detail"]["code"] == "reception_single_club_required"


def test_salle_1_reception_cannot_see_or_review_salle_2_applications(
    client: TestClient,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    plan_response = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Acces collectif Salle 2",
            "duration_months": 1,
            "price": "500.00",
            "currency": "MAD",
            "service_type": "gym",
            "session_count": None,
            "is_active": True,
        },
    )
    assert plan_response.status_code == 201, plan_response.text
    application_response = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Future Membre Salle Deux",
            "phone": f"+21263{uuid.uuid4().int % 100_000_000:08d}",
            "selected_plan_id": plan_response.json()["id"],
        },
    )
    assert application_response.status_code == 201, application_response.text
    application_id = application_response.json()["id"]
    assert application_response.json()["club_id"] == str(SALLE_2_ID)

    reception_list = client.get("/api/v1/membership-applications", headers=reception_headers)
    assert reception_list.status_code == 200, reception_list.text
    assert application_id not in {item["id"] for item in reception_list.json()}

    forbidden_get = client.get(
        f"/api/v1/membership-applications/{application_id}",
        headers=reception_headers,
    )
    assert forbidden_get.status_code == 403, forbidden_get.text
    forbidden_review = client.patch(
        f"/api/v1/membership-applications/{application_id}/review",
        headers=reception_headers,
        json={"status": "approved", "reason": None},
    )
    assert forbidden_review.status_code == 403, forbidden_review.text

    admin_list = client.get(
        "/api/v1/membership-applications",
        headers=admin_headers,
        params={"club_id": str(SALLE_2_ID)},
    )
    assert admin_list.status_code == 200, admin_list.text
    assert application_id in {item["id"] for item in admin_list.json()}


def test_coaching_and_recovery_plans_stay_in_salle_1(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    coaching_plan = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_1_ID),
            "name": "Coaching suivi complet",
            "duration_months": 1,
            "price": "900.00",
            "currency": "MAD",
            "service_type": "coaching",
            "session_count": None,
            "is_active": True,
        },
    )
    assert coaching_plan.status_code == 201, coaching_plan.text
    submitted = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Demande Coaching Salle Un",
            "phone": f"+21264{uuid.uuid4().int % 100_000_000:08d}",
            "selected_plan_id": coaching_plan.json()["id"],
        },
    )
    assert submitted.status_code == 201, submitted.text
    assert submitted.json()["club_id"] == str(SALLE_1_ID)

    invalid_recovery = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Recovery Salle 2 interdit",
            "duration_months": 1,
            "price": "600.00",
            "currency": "MAD",
            "service_type": "recovery",
            "session_count": 10,
            "is_active": True,
        },
    )
    assert invalid_recovery.status_code == 422, invalid_recovery.text
    assert invalid_recovery.json()["detail"]["code"] == "service_unavailable_in_club"


def test_martial_arts_plans_are_session_based_and_stay_in_salle_2(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    missing_sessions = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Kick-boxing senior",
            "duration_months": 1,
            "price": "500.00",
            "currency": "MAD",
            "service_type": "martial_arts",
            "session_count": None,
            "is_active": True,
        },
    )
    assert missing_sessions.status_code == 422, missing_sessions.text

    martial_plan = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Kick-boxing senior",
            "duration_months": 1,
            "price": "500.00",
            "currency": "MAD",
            "service_type": "martial_arts",
            "session_count": 8,
            "is_active": True,
        },
    )
    assert martial_plan.status_code == 201, martial_plan.text
    assert martial_plan.json()["service_type"] == "martial_arts"
    assert martial_plan.json()["session_count"] == 8

    invalid_room = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_1_ID),
            "name": "Arts martiaux Salle 1 interdit",
            "duration_months": 1,
            "price": "500.00",
            "currency": "MAD",
            "service_type": "martial_arts",
            "session_count": 8,
            "is_active": True,
        },
    )
    assert invalid_room.status_code == 422, invalid_room.text
    assert invalid_room.json()["detail"]["code"] == "service_unavailable_in_club"


def test_martial_arts_plan_requires_sessions_at_schema_boundary() -> None:
    with pytest.raises(ValidationError):
        MembershipPlanCreate(
            club_id=SALLE_2_ID,
            name="Kick-boxing senior",
            duration_months=1,
            price="500.00",
            currency="MAD",
            service_type=ServiceType.MARTIAL_ARTS,
        )


def test_admin_can_delete_an_unused_membership_plan(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Formule temporaire a supprimer",
            "duration_months": 1,
            "price": "450.00",
            "currency": "MAD",
            "service_type": "gym",
            "session_count": None,
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text

    deleted = client.delete(
        f"/api/v1/membership-plans/{created.json()['id']}",
        headers=admin_headers,
    )
    assert deleted.status_code == 204, deleted.text
    remaining = client.get(
        "/api/v1/membership-plans",
        params={"active_only": False, "club_id": str(SALLE_2_ID)},
    )
    assert created.json()["id"] not in {item["id"] for item in remaining.json()}


def test_admin_cannot_delete_a_membership_plan_used_by_an_application(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    created = client.post(
        "/api/v1/membership-plans",
        headers=admin_headers,
        json={
            "club_id": str(SALLE_2_ID),
            "name": "Pass protege par historique",
            "duration_months": 1,
            "price": "550.00",
            "currency": "MAD",
            "service_type": "gym",
            "session_count": None,
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    application = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Membre historique",
            "phone": f"+21265{uuid.uuid4().int % 100_000_000:08d}",
            "selected_plan_id": created.json()["id"],
        },
    )
    assert application.status_code == 201, application.text

    deleted = client.delete(
        f"/api/v1/membership-plans/{created.json()['id']}",
        headers=admin_headers,
    )
    assert deleted.status_code == 409, deleted.text
    assert deleted.json()["detail"]["code"] == "plan_in_use"
