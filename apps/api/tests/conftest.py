import uuid
from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.core.security import create_jwt
from app.main import app
from app.modules.auth.otp import OTPProvider, get_otp_provider
from app.modules.users.repository import UserRepository


class CapturingOTPProvider(OTPProvider):
    def __init__(self) -> None:
        self.codes: dict[str, str] = {}

    def send(self, phone: str, code: str) -> None:
        self.codes[phone] = code


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, autoflush=False, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def otp_provider() -> CapturingOTPProvider:
    return CapturingOTPProvider()


@pytest.fixture
def client(
    db_session: Session, otp_provider: CapturingOTPProvider
) -> Generator[TestClient, None, None]:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_otp_provider] = lambda: otp_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def role_headers(db_session: Session, phone: str) -> dict[str, str]:
    user = UserRepository(db_session).by_phone(phone)
    assert user is not None
    token = create_jwt(
        subject=user.id,
        role=user.role.value,
        token_type="access",
        lifetime=timedelta(hours=1),
        session_id=uuid.uuid4(),
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(db_session: Session) -> dict[str, str]:
    return role_headers(db_session, "+212600000001")


@pytest.fixture
def reception_headers(db_session: Session) -> dict[str, str]:
    return role_headers(db_session, "+212600000002")
