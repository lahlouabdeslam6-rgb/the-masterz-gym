import os
import uuid
from pathlib import Path

from fastapi import UploadFile, status

from app.core.config import settings
from app.core.errors import api_error


def _media_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return ".webp"
    if len(content) >= 12 and content[4:8] == b"ftyp":
        return ".mp4"
    if content.startswith(b"\x1aE\xdf\xa3"):
        return ".webm"
    return None


class CafeMediaService:
    def __init__(self, media_root: Path | None = None, max_bytes: int | None = None) -> None:
        self.media_root = media_root or settings.cafe_media_root
        self.max_bytes = max_bytes or settings.cafe_media_max_bytes

    async def save_menu_media(self, media: UploadFile) -> str:
        content = await media.read(self.max_bytes + 1)
        await media.close()
        if not content:
            raise api_error(status.HTTP_400_BAD_REQUEST, "cafe_media_empty", "Le fichier est vide.")
        if len(content) > self.max_bytes:
            raise api_error(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "cafe_media_too_large",
                "Le fichier depasse la taille autorisee.",
                {"max_bytes": self.max_bytes},
            )
        extension = _media_extension(content)
        if not extension:
            raise api_error(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                "cafe_media_invalid_format",
                "Choisissez une photo JPG, PNG, WEBP ou une video MP4, WEBM.",
            )

        self.media_root.mkdir(parents=True, exist_ok=True)
        media_id = uuid.uuid4().hex
        temporary_path = self.media_root / f".{media_id}.upload"
        final_path = self.media_root / f"{media_id}{extension}"
        try:
            temporary_path.write_bytes(content)
            os.replace(temporary_path, final_path)
        finally:
            temporary_path.unlink(missing_ok=True)
        return f"/media/cafe-menu/{final_path.name}"
