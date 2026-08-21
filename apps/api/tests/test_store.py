import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
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

    forbidden_image = client.post(
        "/api/v1/store/product-media",
        headers=reception_headers,
        files={"media": ("produit.png", b"\x89PNG\r\n\x1a\nphoto", "image/png")},
    )
    assert forbidden_image.status_code == 403

    invalid_image = client.post(
        "/api/v1/store/product-media",
        headers=admin_headers,
        files={"media": ("produit.txt", b"pas un media", "text/plain")},
    )
    assert invalid_image.status_code == 415

    uploaded_image = client.post(
        "/api/v1/store/product-media",
        headers=admin_headers,
        files={"media": ("produit.png", b"\x89PNG\r\n\x1a\nphoto", "image/png")},
    )
    assert uploaded_image.status_code == 201, uploaded_image.text
    image_url = uploaded_image.json()["media_url"]
    assert image_url.startswith("/media/store-products/")
    served_image = client.get(image_url)
    assert served_image.status_code == 200
    assert served_image.content == b"\x89PNG\r\n\x1a\nphoto"

    uploaded_video = client.post(
        "/api/v1/store/product-media",
        headers=admin_headers,
        files={"media": ("produit.mp4", b"\x00\x00\x00\x18ftypmp42video", "video/mp4")},
    )
    assert uploaded_video.status_code == 201, uploaded_video.text
    video_url = uploaded_video.json()["media_url"]
    assert video_url.endswith(".mp4")
    assert client.get(video_url).content == b"\x00\x00\x00\x18ftypmp42video"

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
            "image_url": image_url,
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
    assert product["image_url"] == image_url

    public_catalog = client.get("/api/v1/store/catalog")
    assert public_catalog.status_code == 200, public_catalog.text
    public_product = next(item for item in public_catalog.json() if item["id"] == product["id"])
    assert public_product == {
        "id": product["id"],
        "name": "Proteine Masterz",
        "description": "Proteine pour les membres de la salle.",
        "image_url": image_url,
        "price": "350.00",
        "currency": "MAD",
        "is_available": True,
    }

    member_products = client.get("/api/v1/store/products", headers=member_headers)
    assert member_products.status_code == 200, member_products.text
    member_product = next(item for item in member_products.json() if item["id"] == product["id"])
    assert member_product["name"] == "Proteine Masterz"

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
    staff_reservation = next(
        item for item in staff_list.json() if item["id"] == reservation_data["id"]
    )
    assert staff_reservation["member_name"] == member.full_name

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
    product_after_ready = next(
        item for item in products_after_ready.json() if item["id"] == product["id"]
    )
    assert product_after_ready["stock_quantity"] == 3

    ready_again = client.patch(
        f"/api/v1/store/reservations/{reservation_data['id']}/status",
        headers=reception_headers,
        json={"status": "ready"},
    )
    assert ready_again.status_code == 200
    products_after_retry = client.get(
        "/api/v1/store/products?active_only=false", headers=admin_headers
    )
    product_after_retry = next(
        item for item in products_after_retry.json() if item["id"] == product["id"]
    )
    assert product_after_retry["stock_quantity"] == 3

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
    reservation_sale = next(
        item for item in sales.json() if item["reservation_id"] == reservation_data["id"]
    )
    assert reservation_sale["total_amount"] == "700.00"

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
    product_after_sale = next(
        item for item in products_after_sale.json() if item["id"] == product["id"]
    )
    assert product_after_sale["stock_quantity"] == 2

    notifications = client.get("/api/v1/notifications", headers=member_headers)
    assert notifications.status_code == 200
    assert {item["title"] for item in notifications.json()} >= {
        "Produit disponible",
        "Produit recupere",
    }

    (settings.store_media_root / image_url.rsplit("/", 1)[-1]).unlink(missing_ok=True)
    (settings.store_media_root / video_url.rsplit("/", 1)[-1]).unlink(missing_ok=True)
