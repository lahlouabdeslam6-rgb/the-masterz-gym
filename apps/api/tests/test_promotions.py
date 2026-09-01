import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def test_admin_creates_featured_promotion_and_application_uses_special_price(
    client: TestClient,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    plans = client.get(
        "/api/v1/membership-plans",
        params={"active_only": True, "service_type": "gym"},
    )
    assert plans.status_code == 200
    plan = plans.json()[0]
    now = datetime.now(UTC)

    created = client.post(
        "/api/v1/admin/promotions",
        headers=admin_headers,
        json={
            "title": "Offre Duo Masterz",
            "short_description": "Deux personnes profitent ensemble de la salle.",
            "description": "Une offre speciale pour deux membres sur la meme formule.",
            "base_plan_id": plan["id"],
            "price": "3000.00",
            "currency": "MAD",
            "participant_count": 2,
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now + timedelta(days=30)).isoformat(),
            "terms": "Inscription des deux personnes a finaliser a la Reception.",
            "is_active": True,
            "is_featured": True,
        },
    )
    assert created.status_code == 201, created.text
    promotion = created.json()
    assert promotion["slug"].startswith("offre-duo-masterz")
    assert promotion["base_plan_name"] == plan["name"]

    featured = client.get("/api/v1/promotions/featured")
    assert featured.status_code == 200
    assert featured.json()["id"] == promotion["id"]

    admin_promotions = client.get(
        "/api/v1/admin/promotions",
        headers=admin_headers,
    )
    assert admin_promotions.status_code == 200
    assert admin_promotions.json()[0]["id"] == promotion["id"]

    public_offer = client.get(f"/api/v1/promotions/{promotion['slug']}")
    assert public_offer.status_code == 200
    assert public_offer.json()["participant_count"] == 2

    phone = f"+21268{uuid.uuid4().int % 100_000_000:08d}"
    submitted = client.post(
        "/api/v1/membership-applications",
        json={
            "full_name": "Client Offre Duo",
            "phone": phone,
            "selected_plan_id": plan["id"],
            "promotion_id": promotion["id"],
        },
    )
    assert submitted.status_code == 201, submitted.text
    application = submitted.json()
    assert application["promotion_title"] == "Offre Duo Masterz"
    assert application["promotion_price"] == "3000.00"
    assert application["promotion_participant_count"] == 2

    approved = client.patch(
        f"/api/v1/membership-applications/{application['id']}/review",
        headers=reception_headers,
        json={"status": "approved"},
    )
    assert approved.status_code == 200, approved.text

    paid = client.post(
        "/api/v1/payments/memberships",
        headers=reception_headers,
        json={
            "idempotency_key": f"promotion-{uuid.uuid4()}",
            "application_id": application["id"],
            "method": "cash",
        },
    )
    assert paid.status_code == 201, paid.text
    assert paid.json()["amount"] == "3000.00"
    assert "Offre Duo Masterz" in paid.json()["plan_name"]

    audit = client.get(
        "/api/v1/audit-logs",
        headers=admin_headers,
        params={"business_only": True},
    )
    assert audit.status_code == 200
    actions = {entry["action"] for entry in audit.json()}
    assert "promotion.created" in actions
    assert "application.submitted" in actions
