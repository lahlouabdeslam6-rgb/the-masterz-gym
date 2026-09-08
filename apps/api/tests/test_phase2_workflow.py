import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.applications.models import MembershipApplication
from app.modules.auth.otp import OTPProvider
from app.modules.clubs.constants import SALLE_1_ID
from app.modules.clubs.models import UserClubAssignment
from app.modules.memberships.models import MembershipPlan, Subscription
from app.modules.users.models import User
from app.modules.users.photo import MemberPhotoService, VerifiedMemberPhoto
from app.shared.enums import AccountStatus, ServiceType, SubscriptionStatus, UserRole
from app.shared.time import add_months, local_today


def mark_member_photo_verified(member: User) -> None:
    member.profile_photo_url = f"/media/member-photos/{member.id}.jpg"
    member.profile_photo_verified_at = datetime.now(UTC)


def test_login_rejects_invalid_credentials_without_disclosing_account(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"phone": "+212600000001", "password": "incorrect-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_authenticated_user_can_change_password(
    client: TestClient,
    db_session: Session,
) -> None:
    suffix = uuid.uuid4().hex[:8]
    phone = f"+21265{uuid.uuid4().int % 100_000_000:08d}"
    old_password = "CoachPassword123!"
    new_password = "CoachPassword456!"
    coach = User(
        full_name=f"Coach Password {suffix}",
        phone=phone,
        email=f"coach-password-{suffix}@example.com",
        password_hash=hash_password(old_password),
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(coach)
    db_session.flush()

    login = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": old_password},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    wrong_current = client.patch(
        "/api/v1/auth/password",
        headers=headers,
        json={
            "current_password": "WrongPassword123!",
            "new_password": new_password,
        },
    )
    assert wrong_current.status_code == 400
    assert wrong_current.json()["detail"]["code"] == "current_password_incorrect"

    changed = client.patch(
        "/api/v1/auth/password",
        headers=headers,
        json={"current_password": old_password, "new_password": new_password},
    )
    assert changed.status_code == 200, changed.text

    old_login = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": old_password},
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": new_password},
    )
    assert new_login.status_code == 200, new_login.text


def test_unknown_password_reset_is_generic(client: TestClient) -> None:
    response = client.post("/api/v1/auth/password-reset/request", json={"phone": "+212699999999"})
    assert response.status_code == 202
    assert response.json()["message"] == "Si les informations correspondent, un code a été envoyé."
    assert response.json()["challenge_id"]


def test_existing_member_activation_requires_a_verified_photo_before_login(
    client: TestClient,
    db_session: Session,
    otp_provider: OTPProvider,
    tmp_path,
    monkeypatch,
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

    premature_photo = client.post(
        "/api/v1/auth/member-activation/photo",
        data={"challenge_id": requested.json()["challenge_id"]},
        files={"photo": ("visage.jpg", b"photo", "image/jpeg")},
    )
    assert premature_photo.status_code == 400
    assert premature_photo.json()["detail"]["code"] == ("activation_photo_not_authorized")

    confirmed = client.post(
        "/api/v1/auth/member-activation/confirm",
        json={
            "challenge_id": requested.json()["challenge_id"],
            "otp": code,
            "new_password": "ActivatedLocal123!",
        },
    )
    assert confirmed.status_code == 200

    db_session.refresh(member)
    assert member.status == AccountStatus.PENDING_ACTIVATION

    blocked_login = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "ActivatedLocal123!"},
    )
    assert blocked_login.status_code == 401

    async def fake_validation(_service, photo):
        await photo.close()
        saved_path = tmp_path / "activation-member.jpg"
        saved_path.write_bytes(b"verified-photo")
        return VerifiedMemberPhoto(
            media_url="/media/member-photos/activation-member.jpg",
            path=saved_path,
        )

    monkeypatch.setattr(MemberPhotoService, "validate_and_save", fake_validation)
    completed = client.post(
        "/api/v1/auth/member-activation/photo",
        data={"challenge_id": requested.json()["challenge_id"]},
        files={"photo": ("visage.jpg", b"photo", "image/jpeg")},
    )
    assert completed.status_code == 200, completed.text

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "ActivatedLocal123!"},
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["user"]["status"] == "active"
    assert logged_in.json()["user"]["profile_photo_url"] == (
        "/media/member-photos/activation-member.jpg"
    )


def test_reception_can_add_a_verified_photo_to_a_member_dossier(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
    tmp_path,
    monkeypatch,
) -> None:
    member = db_session.query(User).filter(User.phone == "+212600000003").one()

    async def fake_validation(_service, photo):
        await photo.close()
        saved_path = tmp_path / "verified-member.jpg"
        saved_path.write_bytes(b"verified-photo")
        return VerifiedMemberPhoto(
            media_url="/media/member-photos/verified-member.jpg",
            path=saved_path,
        )

    monkeypatch.setattr(MemberPhotoService, "validate_and_save", fake_validation)
    response = client.post(
        f"/api/v1/users/{member.id}/profile-photo",
        headers=reception_headers,
        files={"photo": ("visage.jpg", b"photo", "image/jpeg")},
    )

    assert response.status_code == 200, response.text
    assert response.json()["profile_photo_url"] == "/media/member-photos/verified-member.jpg"
    assert response.json()["profile_photo_verified_at"]
    db_session.refresh(member)
    assert member.profile_photo_verified_at is not None


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


def test_admin_can_modify_password_and_delete_an_unused_user(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    phone = f"+21265{uuid.uuid4().int % 100_000_000:08d}"
    created = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "full_name": "Compte a modifier",
            "phone": phone,
            "email": "before@masterz.example.com",
            "password": "InitialLocal123!",
            "role": "receptionist",
            "status": "active",
            "member_number": None,
        },
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/users/{user_id}",
        headers=admin_headers,
        json={
            "full_name": "Compte modifie",
            "phone": phone,
            "email": "after@masterz.example.com",
            "password": "UpdatedLocal123!",
            "role": "coach",
            "status": "active",
            "member_number": None,
            "reason": "Correction du compte",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == "Compte modifie"
    assert updated.json()["role"] == "coach"

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "UpdatedLocal123!"},
    )
    assert logged_in.status_code == 200, logged_in.text

    deleted = client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert deleted.status_code == 204, deleted.text
    rejected_login = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "UpdatedLocal123!"},
    )
    assert rejected_login.status_code == 401


def test_admin_cannot_delete_own_account(client: TestClient, admin_headers: dict[str, str]) -> None:
    current = client.get("/api/v1/users/me", headers=admin_headers)
    response = client.delete(f"/api/v1/users/{current.json()['id']}", headers=admin_headers)
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "self_delete_forbidden"


def test_admin_can_list_membership_settings(
    client: TestClient,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    response = client.get("/api/v1/membership-settings", headers=admin_headers)
    assert response.status_code == 200
    assert {item["key"] for item in response.json()} == {
        "attendance_duplicate_window_minutes",
        "store_low_stock_threshold",
        "subscription_expiring_soon_days",
        "application_pending_retention_days",
        "subscription_grace_days",
    }

    forbidden = client.get("/api/v1/membership-settings", headers=reception_headers)
    assert forbidden.status_code == 403


def test_pending_applications_are_deleted_after_configured_retention(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    plan = next(
        item
        for item in client.get("/api/v1/membership-plans").json()
        if item["service_type"] == "gym"
    )

    stale_response = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Demande Ancienne",
            "phone": f"+21261{uuid.uuid4().int % 100_000_000:08d}",
            "selected_plan_id": plan["id"],
        },
    )
    recent_response = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Demande Recente",
            "phone": f"+21262{uuid.uuid4().int % 100_000_000:08d}",
            "selected_plan_id": plan["id"],
        },
    )
    assert stale_response.status_code == 201, stale_response.text
    assert recent_response.status_code == 201, recent_response.text

    stale_id = uuid.UUID(stale_response.json()["id"])
    stale = db_session.get(MembershipApplication, stale_id)
    assert stale is not None
    stale.updated_at = datetime.now(UTC) - timedelta(days=8)
    db_session.flush()

    listed = client.get("/api/v1/membership-applications", headers=admin_headers)
    assert listed.status_code == 200, listed.text
    listed_ids = {item["id"] for item in listed.json()}
    assert str(stale_id) not in listed_ids
    assert recent_response.json()["id"] in listed_ids
    assert db_session.get(MembershipApplication, stale_id) is None


def test_admin_can_update_member_profile_with_audit(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    member = db_session.query(User).filter(User.phone == "+212600000003").one()
    new_phone = f"+21262{uuid.uuid4().int % 100_000_000:08d}"
    payload = {
        "full_name": "Membre Profil Modifie",
        "phone": new_phone,
        "email": "profil-modifie@example.com",
        "date_of_birth": "2000-05-10",
        "gender": "male",
        "reason": "Correction du dossier membre",
    }

    forbidden = client.patch(
        f"/api/v1/users/{member.id}/member-profile",
        headers=reception_headers,
        json=payload,
    )
    assert forbidden.status_code == 403

    updated = client.patch(
        f"/api/v1/users/{member.id}/member-profile",
        headers=admin_headers,
        json=payload,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == payload["full_name"]
    assert updated.json()["phone"] == new_phone
    assert updated.json()["email"] == payload["email"]

    summary = client.get(
        "/api/v1/members/subscription-summaries",
        headers=admin_headers,
        params={"query": new_phone},
    )
    assert summary.status_code == 200, summary.text
    assert summary.json()[0]["date_of_birth"] == payload["date_of_birth"]
    assert summary.json()[0]["gender"] == payload["gender"]
    assert summary.json()[0]["account_status"] == "active"

    audit_logs = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_logs.status_code == 200
    assert "member.profile_updated" in {entry["action"] for entry in audit_logs.json()}


def test_coaching_assignment_can_be_created_changed_and_ended(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    first_coach = (
        db_session.query(User).filter(User.role == UserRole.COACH).order_by(User.created_at).first()
    )
    assert first_coach is not None
    second_coach = User(
        full_name="Coach Deuxieme",
        phone=f"+21261{uuid.uuid4().int % 100_000_000:08d}",
        email="coach-deuxieme@example.com",
        password_hash=None,
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
        member_number=None,
    )
    db_session.add(second_coach)
    member_suffix = uuid.uuid4().hex[:8].upper()
    member = User(
        full_name="Membre Coaching Test",
        phone=f"+21262{uuid.uuid4().int % 100_000_000:08d}",
        email=f"coaching-{member_suffix.lower()}@example.com",
        password_hash=None,
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-COACH-{member_suffix}",
    )
    db_session.add(member)
    db_session.flush()

    blocked_without_coaching = client.post(
        "/api/v1/coaching/assignments",
        headers=admin_headers,
        json={
            "coach_id": str(first_coach.id),
            "member_id": str(member.id),
            "reason": "Choix confirme avec le membre",
        },
    )
    assert blocked_without_coaching.status_code == 409
    assert (
        blocked_without_coaching.json()["detail"]["code"] == "active_coaching_subscription_required"
    )

    admin = db_session.query(User).filter(User.phone == "+212600000001").one()
    coaching_plan = MembershipPlan(
        name="Coaching test",
        duration_months=3,
        price="900.00",
        currency="MAD",
        service_type=ServiceType.COACHING,
        is_active=True,
    )
    db_session.add(coaching_plan)
    db_session.flush()
    today = local_today()
    db_session.add(
        Subscription(
            member_id=member.id,
            plan_id=coaching_plan.id,
            status=SubscriptionStatus.ACTIVE,
            starts_on=today,
            ends_on=add_months(today, 3) - timedelta(days=1),
            grace_ends_on=add_months(today, 3) + timedelta(days=3),
            plan_name=coaching_plan.name,
            duration_months=coaching_plan.duration_months,
            price=coaching_plan.price,
            currency=coaching_plan.currency,
            service_type=ServiceType.COACHING,
            created_by_id=admin.id,
        )
    )
    db_session.flush()

    coaches = client.get("/api/v1/coaching/coaches", headers=admin_headers)
    assert coaches.status_code == 200, coaches.text
    assert {item["id"] for item in coaches.json()} >= {
        str(first_coach.id),
        str(second_coach.id),
    }

    assigned = client.post(
        "/api/v1/coaching/assignments",
        headers=reception_headers,
        json={
            "coach_id": str(first_coach.id),
            "member_id": str(member.id),
            "reason": "Choix confirme avec le membre",
        },
    )
    assert assigned.status_code == 201, assigned.text
    assert assigned.json()["coach_id"] == str(first_coach.id)
    assert assigned.json()["member_id"] == str(member.id)

    duplicate = client.post(
        "/api/v1/coaching/assignments",
        headers=reception_headers,
        json={
            "coach_id": str(first_coach.id),
            "member_id": str(member.id),
            "reason": "Tentative de doublon",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "member_already_assigned"

    reassigned = client.post(
        "/api/v1/coaching/assignments",
        headers=admin_headers,
        json={
            "coach_id": str(second_coach.id),
            "member_id": str(member.id),
            "reason": "Changement demande par le membre",
        },
    )
    assert reassigned.status_code == 201, reassigned.text
    assert reassigned.json()["coach_id"] == str(second_coach.id)

    active = client.get(
        "/api/v1/coaching/assignments",
        headers=admin_headers,
        params={"member_id": str(member.id)},
    )
    assert active.status_code == 200, active.text
    assert [item["id"] for item in active.json()] == [reassigned.json()["id"]]

    history = client.get(
        "/api/v1/coaching/assignments",
        headers=admin_headers,
        params={"member_id": str(member.id), "active_only": False},
    )
    assert history.status_code == 200, history.text
    assert len(history.json()) == 2
    assert any(item["ended_at"] for item in history.json())

    ended = client.patch(
        f"/api/v1/coaching/assignments/{reassigned.json()['id']}/end",
        headers=admin_headers,
        json={"reason": "Fin du suivi coaching"},
    )
    assert ended.status_code == 200, ended.text
    assert ended.json()["ended_at"] is not None

    audit_logs = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_logs.status_code == 200
    actions = {entry["action"] for entry in audit_logs.json()}
    assert "coaching.member_assigned" in actions
    assert "coaching.member_reassigned" in actions
    assert "coaching.assignment_ended" in actions


def test_coach_records_objective_and_all_tests_with_private_history(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
) -> None:
    suffix = uuid.uuid4().hex[:8]
    coach_password = "CoachTracking123!"
    other_coach_password = "OtherCoach123!"
    member_password = "MemberTracking123!"
    coach = User(
        full_name="Coach Suivi",
        phone=f"+21264{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(coach_password),
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
        member_number=None,
    )
    other_coach = User(
        full_name="Coach Sans Affectation",
        phone=f"+21265{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(other_coach_password),
        role=UserRole.COACH,
        status=AccountStatus.ACTIVE,
        member_number=None,
    )
    member = User(
        full_name="Membre Progression",
        phone=f"+21266{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(member_password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-PROGRESS-{suffix.upper()}",
    )
    admin = db_session.query(User).filter(User.phone == "+212600000001").one()
    db_session.add_all([coach, other_coach, member])
    db_session.flush()
    coaching_plan = MembershipPlan(
        name=f"Coaching progression {suffix}",
        duration_months=3,
        price="900.00",
        currency="MAD",
        service_type=ServiceType.COACHING,
        is_active=True,
    )
    db_session.add(coaching_plan)
    db_session.flush()
    today = local_today()
    db_session.add(
        Subscription(
            member_id=member.id,
            plan_id=coaching_plan.id,
            status=SubscriptionStatus.ACTIVE,
            starts_on=today,
            ends_on=add_months(today, 3) - timedelta(days=1),
            grace_ends_on=add_months(today, 3) + timedelta(days=3),
            plan_name=coaching_plan.name,
            duration_months=coaching_plan.duration_months,
            price=coaching_plan.price,
            currency=coaching_plan.currency,
            service_type=ServiceType.COACHING,
            created_by_id=admin.id,
        )
    )
    db_session.flush()
    assigned = client.post(
        "/api/v1/coaching/assignments",
        headers=admin_headers,
        json={
            "coach_id": str(coach.id),
            "member_id": str(member.id),
            "reason": "Coach choisi pour le suivi progression",
        },
    )
    assert assigned.status_code == 201, assigned.text

    def login(phone: str, password: str) -> dict[str, str]:
        response = client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    coach_headers = login(coach.phone, coach_password)
    other_coach_headers = login(other_coach.phone, other_coach_password)
    member_headers = login(member.phone, member_password)

    empty_tracking = client.get(
        f"/api/v1/coaching/members/{member.id}/tracking", headers=coach_headers
    )
    assert empty_tracking.status_code == 200, empty_tracking.text
    assert empty_tracking.json()["objective"] is None
    assert empty_tracking.json()["assessments"] == []

    objective = client.patch(
        f"/api/v1/coaching/members/{member.id}/objective",
        headers=coach_headers,
        json={"objective": "Perdre 8 kg et developper la force generale"},
    )
    assert objective.status_code == 200, objective.text
    assert objective.json()["updated_by_name"] == coach.full_name

    tests = [
        ("impedance", {"weight_kg": 86.2, "body_fat_pct": 24.5}),
        ("neuromuscular", {"global_score": 72, "left_balance": 68}),
        ("body_measurements", {"waist_cm": 94, "chest_cm": 104}),
        ("rm_strength", {"exercise": "Squat", "one_rep_max_kg": 110}),
        (
            "nutrition_survey",
            {"meals_per_day": 4, "water_liters": 2.5, "dietary_pattern": "Equilibre"},
        ),
    ]
    for index, (test_type, metrics) in enumerate(tests):
        recorded = client.post(
            f"/api/v1/coaching/members/{member.id}/assessments",
            headers=coach_headers,
            json={
                "test_type": test_type,
                "measured_at": (datetime.now(UTC) - timedelta(days=index)).isoformat(),
                "metrics": metrics,
                "notes": f"Evaluation {test_type}",
            },
        )
        assert recorded.status_code == 201, recorded.text
        assert recorded.json()["test_type"] == test_type

    second_impedance = client.post(
        f"/api/v1/coaching/members/{member.id}/assessments",
        headers=coach_headers,
        json={
            "test_type": "impedance",
            "measured_at": datetime.now(UTC).isoformat(),
            "metrics": {"weight_kg": 84.7, "body_fat_pct": 22.9},
        },
    )
    assert second_impedance.status_code == 201, second_impedance.text

    coach_tracking = client.get(
        f"/api/v1/coaching/members/{member.id}/tracking", headers=coach_headers
    )
    assert coach_tracking.status_code == 200, coach_tracking.text
    assert coach_tracking.json()["objective"]["objective"].startswith("Perdre 8 kg")
    assert len(coach_tracking.json()["assessments"]) == 6
    assert [item["test_type"] for item in coach_tracking.json()["assessments"]].count(
        "impedance"
    ) == 2

    member_tracking = client.get(
        f"/api/v1/coaching/members/{member.id}/tracking", headers=member_headers
    )
    assert member_tracking.status_code == 200, member_tracking.text
    assert member_tracking.json()["assessments"][0]["coach_name"] == coach.full_name

    admin_tracking = client.get(
        f"/api/v1/coaching/members/{member.id}/tracking", headers=admin_headers
    )
    assert admin_tracking.status_code == 200, admin_tracking.text
    assert len(admin_tracking.json()["assessments"]) == 6

    forbidden = client.get(
        f"/api/v1/coaching/members/{member.id}/tracking",
        headers=other_coach_headers,
    )
    assert forbidden.status_code == 403
    member_cannot_write = client.patch(
        f"/api/v1/coaching/members/{member.id}/objective",
        headers=member_headers,
        json={"objective": "Tentative membre"},
    )
    assert member_cannot_write.status_code == 403

    audit_logs = client.get("/api/v1/audit-logs", headers=admin_headers)
    actions = {entry["action"] for entry in audit_logs.json()}
    assert "coaching.objective_created" in actions
    assert "coaching.assessment_recorded" in actions


def test_payment_member_summaries_prioritize_renewals(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
) -> None:
    initial = client.get("/api/v1/members/subscription-summaries", headers=reception_headers)
    assert initial.status_code == 200, initial.text

    receptionist = db_session.query(User).filter(User.phone == "+212600000002").one()
    plan = (
        db_session.query(MembershipPlan)
        .filter(
            MembershipPlan.duration_months == 1,
            MembershipPlan.service_type == ServiceType.GYM,
            MembershipPlan.club_id == SALLE_1_ID,
        )
        .one()
    )
    today = local_today()
    members: list[User] = []
    for index, days_remaining in enumerate((20, 2)):
        member = User(
            full_name=f"Priorite Renouvellement {index}",
            phone=f"+21265500000{index}",
            password_hash=None,
            role=UserRole.MEMBER,
            status=AccountStatus.ACTIVE,
            member_number=f"TMG-PRIORITE-{index}",
        )
        db_session.add(member)
        db_session.flush()
        db_session.add(
            UserClubAssignment(
                user_id=member.id,
                club_id=SALLE_1_ID,
                assigned_by_id=receptionist.id,
            )
        )
        db_session.add(
            Subscription(
                member_id=member.id,
                club_id=SALLE_1_ID,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                starts_on=today - timedelta(days=10),
                ends_on=today + timedelta(days=days_remaining),
                grace_ends_on=today + timedelta(days=days_remaining + 4),
                plan_name=plan.name,
                duration_months=plan.duration_months,
                price=plan.price,
                currency=plan.currency,
                created_by_id=receptionist.id,
            )
        )
        members.append(member)
    db_session.flush()

    response = client.get(
        "/api/v1/members/subscription-summaries",
        headers=reception_headers,
        params={"query": "Priorite Renouvellement"},
    )
    assert response.status_code == 200, response.text
    items = response.json()
    assert [item["id"] for item in items] == [str(members[1].id), str(members[0].id)]
    assert [item["days_remaining"] for item in items] == [2, 20]
    assert items[0]["plan_name"] == plan.name


def test_payment_requires_an_inactive_subscription_and_honors_the_new_start_date(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
) -> None:
    receptionist = db_session.query(User).filter(User.phone == "+212600000002").one()
    plan = (
        db_session.query(MembershipPlan)
        .filter(
            MembershipPlan.duration_months == 1,
            MembershipPlan.service_type == ServiceType.GYM,
            MembershipPlan.club_id == SALLE_1_ID,
        )
        .one()
    )
    today = local_today()
    member = User(
        full_name="Membre Renouvellement Annule",
        phone=f"+21264{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=None,
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-ANN-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()
    old_subscription = Subscription(
        member_id=member.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        starts_on=today - timedelta(days=10),
        ends_on=today + timedelta(days=100),
        grace_ends_on=today + timedelta(days=104),
        plan_name="Ancienne formule longue",
        duration_months=12,
        price=plan.price,
        currency=plan.currency,
        created_by_id=receptionist.id,
    )
    db_session.add(old_subscription)
    db_session.flush()

    blocked = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"active-blocked-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": str(plan.id),
            "starts_on": today.isoformat(),
            "method": "cash",
        },
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "active_subscription"

    coaching_plan = MembershipPlan(
        name="Coaching individuel",
        duration_months=3,
        price="900.00",
        currency="MAD",
        service_type=ServiceType.COACHING,
        is_active=True,
    )
    db_session.add(coaching_plan)
    db_session.flush()
    coaching_paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"coaching-parallel-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": str(coaching_plan.id),
            "starts_on": today.isoformat(),
            "method": "cash",
        },
    )
    assert coaching_paid.status_code == 201, coaching_paid.text
    assert coaching_paid.json()["service_type"] == "coaching"

    duplicate_coaching = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"coaching-blocked-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": str(coaching_plan.id),
            "starts_on": today.isoformat(),
            "method": "cash",
        },
    )
    assert duplicate_coaching.status_code == 409
    assert duplicate_coaching.json()["detail"]["code"] == "active_subscription"

    cancelled = client.patch(
        f"/api/v1/subscriptions/{old_subscription.id}/status",
        headers=reception_headers,
        json={"status": "cancelled", "reason": "Remplacement confirme par le membre"},
    )
    assert cancelled.status_code == 200, cancelled.text

    paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"inactive-renewal-{uuid.uuid4()}",
            "member_id": str(member.id),
            "plan_id": str(plan.id),
            "starts_on": today.isoformat(),
            "method": "cash",
        },
    )
    assert paid.status_code == 201, paid.text
    assert paid.json()["starts_on"] == today.isoformat()
    assert (
        paid.json()["ends_on"]
        == (add_months(today, plan.duration_months) - timedelta(days=1)).isoformat()
    )

    summary = client.get(
        "/api/v1/members/subscription-summaries",
        headers=reception_headers,
        params={"query": member.member_number},
    )
    assert summary.status_code == 200, summary.text
    assert summary.json()[0]["effective_status"] in {"active", "expiring_soon"}
    assert summary.json()[0]["starts_on"] == today.isoformat()
    assert summary.json()[0]["plan_name"] == plan.name


def test_finished_subscription_is_expired_but_keeps_configured_grace_access(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
) -> None:
    receptionist = db_session.query(User).filter(User.phone == "+212600000002").one()
    plan = (
        db_session.query(MembershipPlan)
        .filter(
            MembershipPlan.duration_months == 1,
            MembershipPlan.service_type == ServiceType.GYM,
            MembershipPlan.club_id == SALLE_1_ID,
        )
        .one()
    )
    today = local_today()
    member = User(
        full_name="Membre Expiration Automatique",
        phone=f"+21263{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=None,
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-EXP-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()
    db_session.add(
        UserClubAssignment(
            user_id=member.id,
            club_id=SALLE_1_ID,
            assigned_by_id=receptionist.id,
        )
    )
    mark_member_photo_verified(member)
    subscription = Subscription(
        member_id=member.id,
        club_id=SALLE_1_ID,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        starts_on=today - timedelta(days=32),
        ends_on=today - timedelta(days=1),
        grace_ends_on=today + timedelta(days=3),
        plan_name=plan.name,
        duration_months=plan.duration_months,
        price=plan.price,
        currency=plan.currency,
        created_by_id=receptionist.id,
    )
    db_session.add(subscription)
    db_session.flush()

    summary = client.get(
        "/api/v1/members/subscription-summaries",
        headers=reception_headers,
        params={"query": member.member_number},
    )
    assert summary.status_code == 200, summary.text
    assert summary.json()[0]["effective_status"] == "expired"
    assert summary.json()[0]["days_remaining"] is None

    check_in = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": str(member.id)},
    )
    assert check_in.status_code == 201, check_in.text
    assert check_in.json()["decision"] == "allowed_with_warning"
    assert check_in.json()["subscription_status_at_entry"] == "expired"
    db_session.refresh(subscription)
    assert subscription.status == SubscriptionStatus.EXPIRED


def test_future_subscription_does_not_allow_early_attendance(
    client: TestClient,
    db_session: Session,
    reception_headers: dict[str, str],
) -> None:
    member = db_session.query(User).filter(User.phone == "+212600000003").one()
    mark_member_photo_verified(member)
    receptionist = db_session.query(User).filter(User.phone == "+212600000002").one()
    plan = (
        db_session.query(MembershipPlan)
        .filter(
            MembershipPlan.duration_months == 1,
            MembershipPlan.service_type == ServiceType.GYM,
            MembershipPlan.club_id == SALLE_1_ID,
        )
        .one()
    )
    starts_on = local_today() + timedelta(days=10)
    ends_on = add_months(starts_on, plan.duration_months) - timedelta(days=1)
    subscription = Subscription(
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
    db_session.add(subscription)
    db_session.flush()

    response = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": str(member.id)},
    )
    assert response.status_code == 201
    assert response.json()["decision"] == "denied"

    started_today = client.patch(
        f"/api/v1/subscriptions/{subscription.id}/dates",
        headers=reception_headers,
        json={
            "starts_on": local_today().isoformat(),
            "reason": "Le membre commence son abonnement aujourd'hui",
        },
    )
    assert started_today.status_code == 200, started_today.text
    assert started_today.json()["starts_on"] == local_today().isoformat()
    assert (
        started_today.json()["ends_on"]
        == (add_months(local_today(), plan.duration_months) - timedelta(days=1)).isoformat()
    )

    allowed = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": str(member.id)},
    )
    assert allowed.status_code == 201, allowed.text
    assert allowed.json()["decision"] == "allowed"

    events = client.get(
        f"/api/v1/subscriptions/{subscription.id}/events",
        headers=reception_headers,
    )
    assert events.status_code == 200
    assert events.json()[0]["event_type"] == "dates_changed"


def test_application_payment_attendance_and_audit_workflow(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    plans = client.get(
        "/api/v1/membership-plans",
        params={"club_id": str(SALLE_1_ID)},
    ).json()
    plan = next(
        item for item in plans if item["duration_months"] == 1 and item["service_type"] == "gym"
    )
    final_plan = next(
        item for item in plans if item["duration_months"] == 3 and item["service_type"] == "gym"
    )
    phone = f"+21267{uuid.uuid4().int % 100_000_000:08d}"

    submitted = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Membre Test Phase Deux",
            "phone": phone,
            "email": "phase2@example.com",
            "selected_plan_id": plan["id"],
        },
    )
    assert submitted.status_code == 201, submitted.text
    application_id = submitted.json()["id"]
    assert submitted.json()["status"] == "pending"
    assert submitted.json()["fitness_objective"] is None

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
        "plan_id": final_plan["id"],
        "method": "cash",
    }
    paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json=payment_payload,
    )
    assert paid.status_code == 201, paid.text
    receipt = paid.json()
    assert receipt["amount"] == final_plan["price"]
    assert receipt["currency"] == "MAD"
    assert receipt["plan_name"] == final_plan["name"]
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

    duplicate_application = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Membre Test Phase Deux",
            "phone": phone,
            "email": "phase2@example.com",
            "selected_plan_id": plan["id"],
        },
    )
    assert duplicate_application.status_code == 409
    assert duplicate_application.json()["detail"]["code"] == "active_subscription"

    blocked_without_photo = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": member["id"]},
    )
    assert blocked_without_photo.status_code == 409
    assert blocked_without_photo.json()["detail"]["code"] == "member_photo_required"

    member_model = db_session.get(User, uuid.UUID(member["id"]))
    assert member_model is not None
    mark_member_photo_verified(member_model)
    db_session.flush()

    check_in = client.post(
        "/api/v1/attendance/check-ins",
        headers=reception_headers,
        json={"member_id": member["id"]},
    )
    assert check_in.status_code == 201, check_in.text
    assert check_in.json()["decision"] == "allowed"

    receipt_history = client.get(
        f"/api/v1/payments/members/{member['id']}/receipts", headers=reception_headers
    )
    assert receipt_history.status_code == 200
    assert [item["receipt_id"] for item in receipt_history.json()] == [receipt["receipt_id"]]

    attendance_history = client.get(
        f"/api/v1/attendance/members/{member['id']}", headers=reception_headers
    )
    assert attendance_history.status_code == 200
    assert attendance_history.json()[0]["id"] == check_in.json()["id"]

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
    assert "application.submitted" in actions
    assert "application.approved" in actions
    assert "payment.recorded" in actions
    assert "subscription.created" in actions

    business_logs = client.get(
        "/api/v1/audit-logs",
        headers=admin_headers,
        params={"business_only": True},
    )
    assert business_logs.status_code == 200
    business_actions = {entry["action"] for entry in business_logs.json()}
    assert "application.submitted" in business_actions
    assert "application.approved" in business_actions
    assert all(not action.startswith("auth.") for action in business_actions)
