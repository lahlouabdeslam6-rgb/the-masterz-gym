import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.models import OTPChallenge, RefreshSession


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add_session(self, refresh_session: RefreshSession) -> RefreshSession:
        self.session.add(refresh_session)
        self.session.flush()
        return refresh_session

    def get_session(self, session_id: uuid.UUID) -> RefreshSession | None:
        return self.session.get(RefreshSession, session_id)

    def get_session_by_hash(self, token_hash: str) -> RefreshSession | None:
        return self.session.scalar(
            select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        )

    def add_challenge(self, challenge: OTPChallenge) -> OTPChallenge:
        self.session.add(challenge)
        self.session.flush()
        return challenge

    def get_challenge(self, challenge_id: uuid.UUID) -> OTPChallenge | None:
        return self.session.get(OTPChallenge, challenge_id)

    def expire_open_challenges(self, phone: str, now: datetime) -> None:
        challenges = self.session.scalars(
            select(OTPChallenge).where(
                OTPChallenge.phone == phone,
                OTPChallenge.consumed_at.is_(None),
                OTPChallenge.expires_at > now,
            )
        )
        for challenge in challenges:
            challenge.expires_at = now
