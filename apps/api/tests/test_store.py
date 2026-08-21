import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User
from app.shared.enums import AccountStatus, UserRole


def _member_headers(
    client: TestClient, db_session: Session, *, name: str
) -> tuple[User, dict[str, str]]:
    password = "StoreMember123!"
    member = User(
        full_name=name,
        phone=f"+21266{uuid.uuid4().int % 100_000_000:08d}",
        password_hash=hash_password(password),
        role=UserRole.MEMBER,
        status=AccountStatus.ACTIVE,
        member_number=f"TMG-STORE-{uuid.uuid4().hex[:8].upper()}",
    )
    db_session.add(member)
    db_session.flush()
    login = client.post(
        "/api/v1/auth/login",
        json={"phone": member.phone, "password": password},
    )
    assert login.status_code == 200, login.text
    return member, {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_store_reservation_validation_and_direct_sale_update_stock(
    client: TestClient,
    db_session: Session,
    admin_headers: dict[str, str],
    reception_headers: dict[str, str],
) -> None:
    member, member_headers = _member_headers(client, db_session, name="Client Store")
    _, other_member_headers = _member_headers(client, db_session, name="Autre Client Store")

    forbidden_product = client.post(
        "/api/v1/store/products",
        headers=reception_headers,
        json={
            "name": "Produit interdit",
            "price": "100.00",
            "currency": "MAD",
            "stock_quantity": 1,
            "is_active": True,
        },
    )
    assert forbidden_product.status_code == 403

    blank_product = client.post(
        "/api/v1/store/products",
        headers=admin_headers,
        json={
            "name": "   ",
            "price": "100.00",
            "currency": "mad",
            "stock_quantity": 1,
            "is_active": True,
        },
    )
    assert blank_product.status_code == 422

    created = client.post(
        "/api/v1/store/products",
        headers=admin_headers,
        json={
            "name": "Proteine Masterz",
            "description": "Proteine pour les membres de la salle.",
            "image_url": "https://images.example.test/proteine.jpg",
            "price": "350.00",
            "currency": "MAD",
            "stock_quantity": 5,
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["stock_quantity"] == 5
    assert product["currency"] == "MAD"

    member_products = client.get("/api/v1/store/products", headers=member_headers)
    assert member_products.status_code == 200, member_products.text
    assert member_products.json()[0]["name"] == "Proteine Masterz"

    reservation = client.post(
        "/api/v1/store/reservations",
        headers=member_headers,
        json={"product_id": product["id"], "quantity": 2},
    )
    assert reservation.status_code == 201, reservation.text
    reservation_data = reservation.json()
    assert reservation_data["status"] == "pending"
    assert reservation_data["total_amount"] == "700.00"

    other_reservations = client.get("/api/v1/store/reservations", headers=other_member_headers)
    assert other_reservations.status_code == 200
    assert other_reservations.json() == []

    too_many = client.post(
        "/api/v1/store/reservations",
        headers=other_member_headers,
        json={"product_id": product["id"], "quantity": 6},
    )
    assert too_many.status_code == 409
    assert too_many.json()["detail"]["code"] == "store_insufficient_stock"

    staff_list = client.get("/api/v1/store/reservations", headers=reception_headers)
    assert staff_list.status_code == 200, staff_list.text
    assert staff_list.json()[0]["member_name"] == member.full_name

    ready = client.patch(
        f"/api/v1/store/reservations/{reservation_data['id']}/status",
        headers=reception_headers,
        json={"status": "ready", "notes": "Disponible a la reception."},
    )
    assert ready.status_code == 200, ready.text
    assert ready.json()["status"] == "ready"

    products_after_ready = client.get(
        "/api/v1/store/products?active_only=false", headers=admin_headers
    )
    assert products_after_ready.status_code == 200
    assert products_after_ready.json()[0]["stock_quantity"] == 3

    ready_again = client.patch(
        f"/api/v1/store/reservations/{reservation_data['id']}/status",
        headers=reception_headers,
        json={"status": "ready"},
    )
    assert ready_again.status_code == 200
    products_after_retry = client.get(
        "/api/v1/store/products?active_only=false", headers=admin_headers
    )
    assert products_after_retry.json()[0]["stock_quantity"] == 3

    invalid_completion = client.patch(
        f"/api/v1/store/reservations/{reservation_data['id']}/status",
        headers=reception_headers,
        json={"status": "completed"},
    )
    assert invalid_completion.status_code == 422

    completed = client.patch(
        f"/api/v1/store/reservations/{reservation_data['id']}/status",
        headers=reception_headers,
        json={"status": "completed", "payment_method": "bank_card"},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "completed"

    sales = client.get("/api/v1/store/sales", headers=reception_headers)
    assert sales.status_code == 200, sales.text
    assert len(sales.json()) == 1
    assert sales.json()[0]["reservation_id"] == reservation_data["id"]
    assert sales.json()[0]["total_amount"] == "700.00"

    sale_key = f"direct-store-{uuid.uuid4()}"
    direct_sale = client.post(
        "/api/v1/store/sales",
        headers=reception_headers,
        json={
            "idempotency_key": sale_key,
            "product_id": product["id"],
            "buyer_name": "Client local",
            "quantity": 1,
            "payment_method": "cash",
        },
    )
    assert direct_sale.status_code == 201, direct_sale.text
    assert direct_sale.json()["total_amount"] == "350.00"

    direct_sale_retry = client.post(
        "/api/v1/store/sales",
        headers=reception_headers,
        json={
            "idempotency_key": sale_key,
            "product_id": product["id"],
            "buyer_name": "Client local",
            "quantity": 1,
            "payment_method": "cash",
        },
    )
    assert direct_sale_retry.status_code == 201
    assert direct_sale_retry.json()["id"] == direct_sale.json()["id"]

    products_after_sale = client.get(
        "/api/v1/store/products?active_only=false", headers=admin_headers
    )
    assert products_after_sale.json()[0]["stock_quantity"] == 2

    notifications = client.get("/api/v1/notifications", headers=member_headers)
    assert notifications.status_code == 200
    assert {item["title"] for item in notifications.json()} >= {
        "Produit disponible",
        "Produit recupere",
    }
