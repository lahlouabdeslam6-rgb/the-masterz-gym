import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User
from app.shared.enums import AccountStatus, UserRole


def _member_headers(
    client: TestClient, db_session: Session, *, name: str
) -> tuple[User, dict[str, str]]:
    password = "ComplaintMember123!"
    member = User(
        full_name=name,
        phone=f"+21267{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-REC-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()
    response = client.post(
        "/api/v1/auth/login",
        json={"phone": member.phone, "password": password},
    )
    assert response.status_code == 200, response.text
    return member, {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_complaints_are_routed_and_kept_in_one_conversation(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    member, member_headers = _member_headers(client, db_session, name="Membre Reclamation")
    _, other_member_headers = _member_headers(client, db_session, name="Autre Membre")

    payment = client.post(
        "/api/v1/complaints",
        headers=member_headers,
        json={
            "category": "payment",
            "subject": "Montant du recu",
            "message": "Le montant affiche sur mon recu est incorrect.",
        },
    )
    assert payment.status_code == 201, payment.text
    payment_data = payment.json()
    assert payment_data["assigned_role"] == "receptionist"
    assert payment_data["status"] == "open"
    assert payment_data["member_id"] == str(member.id)
    assert len(payment_data["messages"]) == 1

    reception_list = client.get("/api/v1/complaints", headers=reception_headers)
    assert reception_list.status_code == 200, reception_list.text
    assert [item["id"] for item in reception_list.json()] == [payment_data["id"]]

    reply = client.post(
        f"/api/v1/complaints/{payment_data['id']}/messages",
        headers=reception_headers,
        json={"body": "Nous allons verifier votre recu avec vous."},
    )
    assert reply.status_code == 200, reply.text
    assert len(reply.json()["messages"]) == 2
    assert reply.json()["messages"][-1]["author_role"] == "receptionist"

    in_progress = client.patch(
        f"/api/v1/complaints/{payment_data['id']}/status",
        headers=reception_headers,
        json={"status": "in_progress"},
    )
    assert in_progress.status_code == 200, in_progress.text
    assert in_progress.json()["status"] == "in_progress"

    member_list = client.get("/api/v1/complaints", headers=member_headers)
    assert member_list.status_code == 200, member_list.text
    assert member_list.json()[0]["messages"][-1]["body"].startswith("Nous allons")

    notifications = client.get("/api/v1/notifications", headers=member_headers)
    assert notifications.status_code == 200, notifications.text
    assert any(item["kind"] == "complaint_reply" for item in notifications.json())

    forbidden = client.post(
        f"/api/v1/complaints/{payment_data['id']}/messages",
        headers=other_member_headers,
        json={"body": "Je ne dois pas acceder a cette conversation."},
    )
    assert forbidden.status_code == 403, forbidden.text

    coaching = client.post(
        "/api/v1/complaints",
        headers=member_headers,
        json={
            "category": "coaching",
            "subject": "Suivi de mon objectif",
            "message": "Je souhaite parler du suivi de mon objectif sportif.",
        },
    )
    assert coaching.status_code == 201, coaching.text
    assert coaching.json()["assigned_role"] == "admin"

    reception_after = client.get("/api/v1/complaints", headers=reception_headers)
    assert reception_after.status_code == 200, reception_after.text
    assert [item["id"] for item in reception_after.json()] == [payment_data["id"]]

    reception_forbidden = client.post(
        f"/api/v1/complaints/{coaching.json()['id']}/messages",
        headers=reception_headers,
        json={"body": "Cette reclamation appartient a l'administration."},
    )
    assert reception_forbidden.status_code == 403, reception_forbidden.text

    admin_list = client.get("/api/v1/complaints", headers=admin_headers)
    assert admin_list.status_code == 200, admin_list.text
    assert {
        payment_data["id"],
        coaching.json()["id"],
    }.issubset({item["id"] for item in admin_list.json()})
