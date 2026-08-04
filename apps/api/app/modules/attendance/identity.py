import uuid
from typing import Protocol

from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class AttendanceIdentityProvider(Protocol):
    """Future device adapters resolve identities without exposing biometric data."""

    def resolve(self, external_identifier: str) -> User | None: ...


class ManualMemberIdentityProvider:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def resolve(self, external_identifier: str) -> User | None:
        try:
            return self.users.get(uuid.UUID(external_identifier))
        except ValueError:
            return self.users.by_member_number(external_identifier)
