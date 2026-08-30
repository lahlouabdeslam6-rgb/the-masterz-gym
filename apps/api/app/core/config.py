from functools import lru_cache
from pathlib import Path
from tempfile import gettempdir

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "The Masterz Gym API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://masterz:masterz_local_only@localhost:5432/masterz_gym"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:13000",
        "http://127.0.0.1:13000",
    ]
    environment: str = "development"
    gym_timezone: str = "Africa/Casablanca"
    jwt_secret_key: str = "masterz-local-jwt-secret-change-me-2026"
    jwt_refresh_secret_key: str = "masterz-local-refresh-secret-change-me-2026"
    access_token_minutes: int = 30
    refresh_token_days: int = 30
    otp_expiry_minutes: int = 10
    store_media_root: Path = Path(gettempdir()) / "masterz-gym" / "store-products"
    store_media_max_bytes: int = 30 * 1024 * 1024
    cafe_media_root: Path = Path(gettempdir()) / "masterz-gym" / "cafe-menu"
    cafe_media_max_bytes: int = 8 * 1024 * 1024
    member_photo_root: Path = Path(gettempdir()) / "masterz-gym" / "member-photos"
    member_photo_max_bytes: int = 8 * 1024 * 1024
    member_photo_min_dimension: int = 320
    member_photo_min_brightness: float = 35.0
    member_photo_min_contrast: float = 12.0
    member_photo_min_face_area_ratio: float = 0.06
    coaching_media_root: Path = Path(gettempdir()) / "masterz-gym" / "coaching"
    coaching_media_max_bytes: int = 15 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
