import asyncio
from io import BytesIO

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile

from app.modules.users.photo import MemberPhotoService


def encoded_jpeg(value: int, *, noise: bool = False) -> bytes:
    if noise:
        generator = np.random.default_rng(2026)
        image = generator.integers(70, 210, size=(640, 640, 3), dtype=np.uint8)
    else:
        image = np.full((640, 640, 3), value, dtype=np.uint8)
    success, encoded = cv2.imencode(".jpg", image)
    assert success
    return encoded.tobytes()


def upload_file(content: bytes) -> UploadFile:
    return UploadFile(filename="visage.jpg", file=BytesIO(content))


def test_member_photo_is_cropped_and_saved_after_one_face_is_detected(
    tmp_path, monkeypatch
) -> None:
    service = MemberPhotoService(media_root=tmp_path, max_bytes=2_000_000)
    monkeypatch.setattr(
        service,
        "_detect_faces",
        lambda _grayscale: [(160, 130, 300, 300)],
    )

    saved = asyncio.run(service.validate_and_save(upload_file(encoded_jpeg(0, noise=True))))

    assert saved.media_url.startswith("/media/member-photos/")
    assert saved.path.exists()
    normalized = cv2.imread(str(saved.path))
    assert normalized.shape[:2] == (720, 720)


def test_member_photo_rejects_a_dark_image(tmp_path) -> None:
    service = MemberPhotoService(media_root=tmp_path, max_bytes=2_000_000)

    try:
        asyncio.run(service.validate_and_save(upload_file(encoded_jpeg(5))))
    except HTTPException as exc:
        assert exc.status_code == 422
        assert exc.detail["code"] == "member_photo_too_dark"
    else:
        raise AssertionError("Une photo sombre aurait du etre refusee.")


def test_member_photo_rejects_an_image_without_a_face(tmp_path, monkeypatch) -> None:
    service = MemberPhotoService(media_root=tmp_path, max_bytes=2_000_000)
    monkeypatch.setattr(service, "_detect_faces", lambda _grayscale: [])

    try:
        asyncio.run(service.validate_and_save(upload_file(encoded_jpeg(0, noise=True))))
    except HTTPException as exc:
        assert exc.status_code == 422
        assert exc.detail["code"] == "member_photo_no_face"
    else:
        raise AssertionError("Une image sans visage aurait du etre refusee.")
