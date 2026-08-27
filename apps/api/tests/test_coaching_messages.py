import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.modules.coaching.models import CoachMemberAssignment
from app.modules.users.models import User
from app.shared.enums import AccountStatus, UserRole


def _login(client: TestClient, phone: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_coach_member_conversation_supports_text_photo_audio_and_admin_monitoring(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    tmp_path,
    monkeypatch,
) -> None:
    suffix = str(uuid.uuid4().int)[-7:]
    password = "CoachingChat123!"
    coach = User(
        full_name="Coach Conversation",
        phone=f"+21261{suffix}",
        email=f"coach-chat-{suffix}@example.com",
        password_hash=hash_password(password),
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
        member_number=None,
    )
    member = User(
        full_name="Membre Conversation",
        phone=f"+21262{suffix}",
        email=f"member-chat-{suffix}@example.com",
        password_hash=hash_password(password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-CHAT-{suffix}",
    )
    other_member = User(
        full_name="Membre Sans Acces",
        phone=f"+21264{suffix}",
        email=f"other-chat-{suffix}@example.com",
        password_hash=hash_password(password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-OTHER-{suffix}",
    )
    db_session.add_all([coach, member, other_member])
    db_session.flush()
    admin = db_session.query(User).filter(User.phone == "+212600000001").one()
    assignment = CoachMemberAssignment(
        coach_id=coach.id,
        member_id=member.id,
        assigned_by_id=admin.id,
        started_at=datetime.now(UTC),
        ended_at=None,
        reason="Test conversation coaching",
    )
    db_session.add(assignment)
    db_session.flush()

    monkeypatch.setattr(settings, "coaching_media_root", tmp_path)
    coach_headers = _login(client, coach.phone, password)
    member_headers = _login(client, member.phone, password)
    other_headers = _login(client, other_member.phone, password)

    conversations = client.get("/api/v1/coaching/conversations", headers=member_headers)
    assert conversations.status_code == 200, conversations.text
    assert conversations.json()[0]["assignment_id"] == str(assignment.id)

    text_message = client.post(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=member_headers,
        data={"body": "Hadi photo dyal lmakla dyal lyom."},
    )
    assert text_message.status_code == 201, text_message.text
    assert text_message.json()["sender_role"] == "member"

    photo_message = client.post(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=coach_headers,
        data={"body": "Mzyan, kemel 3la nafs programme."},
        files={"media": ("repas.png", b"\x89PNG\r\n\x1a\nphoto", "image/png")},
    )
    assert photo_message.status_code == 201, photo_message.text
    assert photo_message.json()["media_type"] == "image"
    assert (tmp_path / photo_message.json()["media_url"].split("/")[-1]).exists()

    audio_message = client.post(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=member_headers,
        files={"media": ("question.mp3", b"ID3audio", "audio/mpeg")},
    )
    assert audio_message.status_code == 201, audio_message.text
    assert audio_message.json()["media_type"] == "audio"

    messages = client.get(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=coach_headers,
    )
    assert messages.status_code == 200, messages.text
    assert [item["media_type"] for item in messages.json()] == [None, "image", "audio"]

    coach_notifications = client.get(
        "/api/v1/notifications?unread_only=true&limit=100",
        headers=coach_headers,
    )
    assert coach_notifications.status_code == 200, coach_notifications.text
    assert (
        sum(item["kind"] == "coaching_message_received" for item in coach_notifications.json()) == 2
    )
    member_notifications = client.get(
        "/api/v1/notifications?unread_only=true&limit=100",
        headers=member_headers,
    )
    assert member_notifications.status_code == 200, member_notifications.text
    assert any(item["kind"] == "coaching_message_received" for item in member_notifications.json())

    admin_conversations = client.get("/api/v1/coaching/conversations", headers=admin_headers)
    assert admin_conversations.status_code == 200, admin_conversations.text
    assert str(assignment.id) in {item["assignment_id"] for item in admin_conversations.json()}
    admin_messages = client.get(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=admin_headers,
    )
    assert admin_messages.status_code == 200, admin_messages.text
    admin_cannot_write = client.post(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=admin_headers,
        data={"body": "Admin ne doit pas ecrire ici."},
    )
    assert admin_cannot_write.status_code == 403

    assert client.get("/api/v1/coaching/conversations", headers=other_headers).json() == []
    forbidden = client.get(
        f"/api/v1/coaching/conversations/{assignment.id}/messages",
        headers=other_headers,
    )
    assert forbidden.status_code == 403
