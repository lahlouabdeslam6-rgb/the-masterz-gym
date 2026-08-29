import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification
from app.modules.users.models import User


def _login(client: TestClient, phone: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_opening_notifications_marks_existing_items_read_but_keeps_new_items_unread(
    client: TestClient,
    db_session: Session,
) -> None:
    member = db_session.query(User).filter(User.phone == "+212600000003").one()
    first_notifications = [
        Notification(
            user_id=member.id,
            kind="coaching_booking_status",
            title=f"Notification {index}",
            body="Mise a jour coaching.",
            deduplication_key=f"notification-read-all:{uuid.uuid4()}",
        )
        for index in (1, 2)
    ]
    db_session.add_all(first_notifications)
    db_session.flush()
    headers = _login(client, member.phone, "MemberLocal123!")

    unread_before = client.get("/api/v1/notifications?unread_only=true&limit=100", headers=headers)
    assert unread_before.status_code == 200, unread_before.text
    assert len(unread_before.json()) == 2

    marked = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert marked.status_code == 200, marked.text
    assert marked.json() == {"marked_read": 2}

    unread_after = client.get("/api/v1/notifications?unread_only=true&limit=100", headers=headers)
    assert unread_after.status_code == 200, unread_after.text
    assert unread_after.json() == []

    new_notification = Notification(
        user_id=member.id,
        kind="coaching_message_received",
        title="Nouveau message",
        body="Un nouveau message est arrive apres la lecture.",
        deduplication_key=f"notification-read-all:{uuid.uuid4()}",
    )
    db_session.add(new_notification)
    db_session.flush()

    latest_unread = client.get("/api/v1/notifications?unread_only=true&limit=100", headers=headers)
    assert latest_unread.status_code == 200, latest_unread.text
    assert [item["id"] for item in latest_unread.json()] == [str(new_notification.id)]
