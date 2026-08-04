import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    return bool(password_hash) and password_hasher.verify(password, password_hash)


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def hash_otp(challenge_id: uuid.UUID, code: str) -> str:
    return hash_token(f"{challenge_id}:{code}:{settings.jwt_secret_key}")


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_jwt(
    *, subject: uuid.UUID, role: str, token_type: str, lifetime: timedelta, session_id: uuid.UUID
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": token_type,
        "sid": str(session_id),
        "iat": now,
        "exp": now + lifetime,
        "jti": str(uuid.uuid4()),
    }
    secret = settings.jwt_secret_key if token_type == "access" else settings.jwt_refresh_secret_key
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_jwt(token: str, token_type: str) -> dict[str, Any]:
    secret = settings.jwt_secret_key if token_type == "access" else settings.jwt_refresh_secret_key
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    if payload.get("type") != token_type:
        raise jwt.InvalidTokenError("Type de jeton invalide")
    return payload
