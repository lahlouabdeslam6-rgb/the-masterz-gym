from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.clubs.constants import SALLE_1_ID, SALLE_2_ID
from app.modules.users.repository import UserRepository


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
