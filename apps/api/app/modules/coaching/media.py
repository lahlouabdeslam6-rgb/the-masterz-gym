import os
import uuid
from pathlib import Path

from fastapi import UploadFile, status

from app.core.config import settings
from app.core.errors import api_error


def _detect_media(content: bytes) -> tuple[str, str] | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image"
    if len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return ".webp", "image"
    if content.startswith(b"ID3") or content[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        return ".mp3", "audio"
    if len(content) >= 12 and content[4:8] == b"ftyp":
        return ".m4a", "audio"
    if content.startswith(b"\x1aE\xdf\xa3"):
        return ".webm", "audio"
    if content.startswith(b"RIFF") and content[8:12] == b"WAVE":
        return ".wav", "audio"
    return None


class CoachingMediaService:
    async def save(self, media: UploadFile) -> tuple[str, str, Path]:
        content = await media.read(settings.coaching_media_max_bytes + 1)
        await media.close()
        if not content:
            raise api_error(
                status.HTTP_400_BAD_REQUEST, "coaching_media_empty", "Le fichier est vide."
            )
        if len(content) > settings.coaching_media_max_bytes:
            raise api_error(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "coaching_media_too_large",
                "Le fichier depasse la taille autorisee.",
                {"max_bytes": settings.coaching_media_max_bytes},
            )
        detected = _detect_media(content)
        if not detected:
            raise api_error(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                "coaching_media_invalid_format",
                "Choisissez une photo JPG, PNG, WEBP ou un audio MP3, M4A, WAV, WEBM.",
            )
        extension, media_type = detected
        settings.coaching_media_root.mkdir(parents=True, exist_ok=True)
        media_id = uuid.uuid4().hex
        temporary = settings.coaching_media_root / f".{media_id}.upload"
        final = settings.coaching_media_root / f"{media_id}{extension}"
        try:
            temporary.write_bytes(content)
            os.replace(temporary, final)
        finally:
            temporary.unlink(missing_ok=True)
        return f"/media/coaching/{final.name}", media_type, final
