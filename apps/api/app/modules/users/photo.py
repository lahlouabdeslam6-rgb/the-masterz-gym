from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from fastapi import UploadFile, status

from app.core.config import settings
from app.core.errors import api_error


@dataclass(frozen=True)
class VerifiedMemberPhoto:
    media_url: str
    path: Path


class MemberPhotoService:
    def __init__(self, media_root: Path | None = None, max_bytes: int | None = None) -> None:
        self.media_root = media_root or settings.member_photo_root
        self.max_bytes = max_bytes or settings.member_photo_max_bytes
        cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        self.face_detector = cv2.CascadeClassifier(str(cascade_path))

    async def validate_and_save(self, photo: UploadFile) -> VerifiedMemberPhoto:
        content = await photo.read(self.max_bytes + 1)
        await photo.close()
        if not content:
            raise api_error(
                status.HTTP_400_BAD_REQUEST,
                "member_photo_empty",
                "La photo est vide.",
            )
        if len(content) > self.max_bytes:
            raise api_error(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "member_photo_too_large",
                "La photo depasse la taille autorisee.",
                {"max_bytes": self.max_bytes},
            )

        image = cv2.imdecode(np.frombuffer(content, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise api_error(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                "member_photo_invalid_format",
                "Choisissez une photo JPG, PNG ou WEBP valide.",
            )

        height, width = image.shape[:2]
        if min(height, width) < settings.member_photo_min_dimension:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_too_small",
                "La photo est trop petite. Utilisez une image nette d'au moins 320 pixels.",
            )

        grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if float(grayscale.mean()) < settings.member_photo_min_brightness:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_too_dark",
                "La photo est trop sombre. Placez le visage dans un endroit bien eclaire.",
            )
        if float(grayscale.std()) < settings.member_photo_min_contrast:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_low_contrast",
                "Le visage n'est pas assez visible. Reprenez la photo avec un meilleur eclairage.",
            )

        faces = self._detect_faces(grayscale)
        if not faces:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_no_face",
                "Aucun visage net n'a ete detecte. Regardez la camera de face.",
            )
        if len(faces) > 1:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_multiple_faces",
                "La photo doit contenir uniquement le visage du membre.",
            )

        x, y, face_width, face_height = faces[0]
        face_ratio = (face_width * face_height) / float(width * height)
        if face_ratio < settings.member_photo_min_face_area_ratio:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_photo_face_too_small",
                "Rapprochez-vous de la camera pour que le visage soit bien visible.",
            )

        squared = self._square_face_crop(image, x, y, face_width, face_height)
        normalized = cv2.resize(squared, (720, 720), interpolation=cv2.INTER_AREA)
        encoded, jpeg = cv2.imencode(".jpg", normalized, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not encoded:
            raise api_error(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "member_photo_processing_failed",
                "La photo n'a pas pu etre traitee.",
            )

        self.media_root.mkdir(parents=True, exist_ok=True)
        photo_id = uuid.uuid4().hex
        temporary_path = self.media_root / f".{photo_id}.upload"
        final_path = self.media_root / f"{photo_id}.jpg"
        try:
            temporary_path.write_bytes(jpeg.tobytes())
            os.replace(temporary_path, final_path)
        finally:
            temporary_path.unlink(missing_ok=True)
        return VerifiedMemberPhoto(
            media_url=f"/media/member-photos/{final_path.name}", path=final_path
        )

    def _detect_faces(self, grayscale: np.ndarray) -> list[tuple[int, int, int, int]]:
        height, width = grayscale.shape[:2]
        minimum = max(int(min(height, width) * 0.14), 48)
        detected = self.face_detector.detectMultiScale(
            grayscale,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(minimum, minimum),
        )
        return [tuple(int(value) for value in face) for face in detected]

    @staticmethod
    def _square_face_crop(image: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
        image_height, image_width = image.shape[:2]
        center_x = x + width / 2
        center_y = y + height / 2
        side = max(width, height) * 2.15
        left = max(int(center_x - side / 2), 0)
        top = max(int(center_y - side / 2), 0)
        right = min(int(center_x + side / 2), image_width)
        bottom = min(int(center_y + side / 2), image_height)
        crop = image[top:bottom, left:right]

        crop_height, crop_width = crop.shape[:2]
        output_side = max(crop_height, crop_width)
        output = np.zeros((output_side, output_side, 3), dtype=np.uint8)
        y_offset = (output_side - crop_height) // 2
        x_offset = (output_side - crop_width) // 2
        output[y_offset : y_offset + crop_height, x_offset : x_offset + crop_width] = crop
        return output

    def remove(self, media_url: str | None) -> None:
        if not media_url or not media_url.startswith("/media/member-photos/"):
            return
        path = (self.media_root / Path(media_url).name).resolve()
        root = self.media_root.resolve()
        if path.parent == root:
            path.unlink(missing_ok=True)
