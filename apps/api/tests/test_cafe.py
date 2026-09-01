import uuid
from io import BytesIO

from fastapi.testclient import TestClient


def test_admin_manages_public_cafe_menu(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    name = f"Smoothie Test {uuid.uuid4().hex[:8]}"
    created = client.post(
        "/api/v1/cafe/menu-items",
        headers=admin_headers,
        json={
            "name": name,
            "category": "Smoothies",
            "description": "Preparation du moment.",
            "image_url": "/media/cafe-menu/smoothie.jpg",
            "media_urls": [
                "/media/cafe-menu/smoothie.jpg",
                "/media/cafe-menu/smoothie.mp4",
            ],
            "price": "35.00",
            "currency": "MAD",
            "display_order": 2,
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["price"] == "35.00"
    assert item["media_urls"] == [
        "/media/cafe-menu/smoothie.jpg",
        "/media/cafe-menu/smoothie.mp4",
    ]

    public_menu = client.get("/api/v1/cafe/menu")
    assert public_menu.status_code == 200
    assert any(entry["id"] == item["id"] for entry in public_menu.json())

    updated = client.patch(
        f"/api/v1/cafe/menu-items/{item['id']}",
        headers=admin_headers,
        json={"price": "39.00", "is_active": False},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["price"] == "39.00"
    assert updated.json()["is_active"] is False

    admin_menu = client.get("/api/v1/cafe/menu-items", headers=admin_headers)
    assert admin_menu.status_code == 200
    assert any(entry["id"] == item["id"] for entry in admin_menu.json())

    public_after_hide = client.get("/api/v1/cafe/menu")
    assert all(entry["id"] != item["id"] for entry in public_after_hide.json())

    deleted = client.delete(
        f"/api/v1/cafe/menu-items/{item['id']}",
        headers=admin_headers,
    )
    assert deleted.status_code == 204, deleted.text
    admin_after_delete = client.get("/api/v1/cafe/menu-items", headers=admin_headers)
    assert all(entry["id"] != item["id"] for entry in admin_after_delete.json())


def test_cafe_menu_admin_permissions_and_image_validation(
    client: TestClient,
    reception_headers: dict[str, str],
    admin_headers: dict[str, str],
) -> None:
    forbidden = client.post(
        "/api/v1/cafe/menu-items",
        headers=reception_headers,
        json={
            "name": "Cafe interdit",
            "category": "Cafe",
            "price": "10.00",
            "currency": "MAD",
        },
    )
    assert forbidden.status_code == 403

    forbidden_delete = client.delete(
        f"/api/v1/cafe/menu-items/{uuid.uuid4()}",
        headers=reception_headers,
    )
    assert forbidden_delete.status_code == 403

    invalid_media = client.post(
        "/api/v1/cafe/menu-media",
        headers=admin_headers,
        files={"media": ("menu.txt", BytesIO(b"not-an-image"), "text/plain")},
    )
    assert invalid_media.status_code == 415

    video_media = client.post(
        "/api/v1/cafe/menu-media",
        headers=admin_headers,
        files={
            "media": (
                "menu.mp4",
                BytesIO(b"\x00\x00\x00\x18ftypisom" + b"video"),
                "video/mp4",
            )
        },
    )
    assert video_media.status_code == 200, video_media.text
    assert video_media.json()["media_url"].endswith(".mp4")
