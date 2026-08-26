import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error
from app.core.security import (
    create_jwt,
    decode_jwt,
    generate_otp,
    hash_otp,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.audit.service import AuditService
from app.modules.auth.models import OTPChallenge, RefreshSession
from app.modules.auth.otp import OTPProvider
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import ExistingMemberActivationRequest, TokenPair
from app.modules.users.models import User
from app.modules.users.photo import MemberPhotoService
from app.modules.users.repository import UserRepository
from app.shared.enums import AccountStatus, OTPPurpose, UserRole


class AuthService:
    def __init__(self, session: Session, otp_provider: OTPProvider) -> None:
        self.session = session
        self.auth = AuthRepository(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)
        self.otp_provider = otp_provider

    def _token_pair(self, user: User) -> TokenPair:
        session_id = uuid.uuid4()
        refresh_lifetime = timedelta(days=settings.refresh_token_days)
        access_token = create_jwt(
            subject=user.id,
            role=user.role.value,
            token_type="access",
            lifetime=timedelta(minutes=settings.access_token_minutes),
            session_id=session_id,
        )
        refresh_token = create_jwt(
            subject=user.id,
            role=user.role.value,
            token_type="refresh",
            lifetime=refresh_lifetime,
            session_id=session_id,
        )
        self.auth.add_session(
            RefreshSession(
                id=session_id,
                user_id=user.id,
                token_hash=hash_token(refresh_token),
                expires_at=datetime.now(UTC) + refresh_lifetime,
            )
        )
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_minutes * 60,
            user=user,
        )

    def login(self, phone: str, password: str) -> TokenPair:
        user = self.users.by_phone(phone)
        if (
            not user
            or user.status != AccountStatus.ACTIVE
            or not verify_password(password, user.password_hash)
        ):
            self.audit.record(
                actor=user,
                action="auth.login_failed",
                entity_type="authentication",
                entity_id=hash_token(phone),
                reason="invalid_credentials_or_inactive_account",
            )
            # HTTP exceptions trigger the request rollback; persist this security event first.
            self.session.commit()
            raise api_error(
                status.HTTP_401_UNAUTHORIZED,
                "invalid_credentials",
                "Numéro de téléphone ou mot de passe incorrect.",
            )
        pair = self._token_pair(user)
        self.audit.record(
            actor=user,
            action="auth.login_succeeded",
            entity_type="user",
            entity_id=user.id,
        )
        return pair

    def refresh(self, token: str) -> TokenPair:
        try:
            payload = decode_jwt(token, "refresh")
            session_id = uuid.UUID(payload["sid"])
            user_id = uuid.UUID(payload["sub"])
        except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
            raise api_error(
                status.HTTP_401_UNAUTHORIZED, "invalid_refresh_token", "Jeton invalide."
            ) from exc
        refresh_session = self.auth.get_session(session_id)
        now = datetime.now(UTC)
        if (
            not refresh_session
            or refresh_session.revoked_at is not None
            or refresh_session.expires_at <= now
            or not secrets.compare_digest(refresh_session.token_hash, hash_token(token))
        ):
            raise api_error(
                status.HTTP_401_UNAUTHORIZED, "invalid_refresh_token", "Jeton invalide."
            )
        user = self.users.get(user_id)
        if not user or user.status != AccountStatus.ACTIVE:
            raise api_error(
                status.HTTP_401_UNAUTHORIZED, "invalid_refresh_token", "Jeton invalide."
            )
        refresh_session.revoked_at = now
        return self._token_pair(user)

    def logout(self, token: str, actor: User) -> None:
        refresh_session = self.auth.get_session_by_hash(hash_token(token))
        if refresh_session and refresh_session.user_id == actor.id:
            refresh_session.revoked_at = datetime.now(UTC)
        self.audit.record(
            actor=actor,
            action="auth.logout",
            entity_type="user",
            entity_id=actor.id,
        )

    def request_password_reset(self, phone: str) -> OTPChallenge:
        user = self.users.by_phone(phone)
        eligible = user if user and user.status == AccountStatus.ACTIVE else None
        return self._create_challenge(phone, OTPPurpose.PASSWORD_RESET, eligible)

    def request_member_activation(self, data: ExistingMemberActivationRequest) -> OTPChallenge:
        user = self.users.by_phone(data.phone)
        matches = bool(
            user
            and user.role == UserRole.MEMBER
            and user.status == AccountStatus.PENDING_ACTIVATION
            and user.full_name.casefold() == data.full_name.strip().casefold()
            and (data.date_of_birth is None or user.date_of_birth == data.date_of_birth)
            and (data.member_number is None or user.member_number == data.member_number)
            and (data.date_of_birth is not None or data.member_number is not None)
        )
        return self._create_challenge(
            data.phone,
            OTPPurpose.EXISTING_MEMBER_ACTIVATION,
            user if matches else None,
        )

    def _create_challenge(self, phone: str, purpose: OTPPurpose, user: User | None) -> OTPChallenge:
        now = datetime.now(UTC)
        self.auth.expire_open_challenges(phone, now)
        challenge_id = uuid.uuid4()
        code = generate_otp()
        challenge = OTPChallenge(
            id=challenge_id,
            user_id=user.id if user else None,
            phone=phone,
            purpose=purpose,
            code_hash=hash_otp(challenge_id, code),
            expires_at=now + timedelta(minutes=settings.otp_expiry_minutes),
        )
        self.auth.add_challenge(challenge)
        self.otp_provider.send(phone, code)
        return challenge

    def confirm_otp_password(
        self, challenge_id: uuid.UUID, code: str, password: str, purpose: OTPPurpose
    ) -> User:
        challenge = self.auth.get_challenge(challenge_id)
        now = datetime.now(UTC)
        valid = bool(
            challenge
            and challenge.purpose == purpose
            and challenge.user_id is not None
            and challenge.consumed_at is None
            and challenge.expires_at > now
            and secrets.compare_digest(challenge.code_hash, hash_otp(challenge_id, code))
        )
        if not valid or not challenge:
            raise api_error(
                status.HTTP_400_BAD_REQUEST,
                "invalid_or_expired_otp",
                "Le code est invalide ou expiré.",
            )
        user = self.users.get(challenge.user_id)
        if not user:
            raise api_error(
                status.HTTP_400_BAD_REQUEST,
                "invalid_or_expired_otp",
                "Le code est invalide ou expiré.",
            )
        challenge.consumed_at = now
        user.password_hash = hash_password(password)
        action = "auth.password_reset"
        if purpose == OTPPurpose.EXISTING_MEMBER_ACTIVATION:
            action = "auth.member_activation_verified"
        self.session.flush()
        self.audit.record(
            actor=user,
            action=action,
            entity_type="user",
            entity_id=user.id,
            new_value={"status": user.status.value},
        )
        return user

    async def complete_member_activation(self, challenge_id: uuid.UUID, photo: UploadFile) -> User:
        challenge = self.auth.get_challenge(challenge_id)
        now = datetime.now(UTC)
        valid = bool(
            challenge
            and challenge.purpose == OTPPurpose.EXISTING_MEMBER_ACTIVATION
            and challenge.user_id is not None
            and challenge.consumed_at is not None
            and challenge.expires_at > now
        )
        if not valid or not challenge:
            raise api_error(
                status.HTTP_400_BAD_REQUEST,
                "activation_photo_not_authorized",
                "Verifiez de nouveau votre identite avant d'ajouter la photo.",
            )

        user = self.users.get(challenge.user_id)
        if (
            not user
            or user.role != UserRole.MEMBER
            or user.status != AccountStatus.PENDING_ACTIVATION
            or not user.password_hash
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_activation_not_pending",
                "Ce compte ne peut pas etre active avec cette demande.",
            )

        media = MemberPhotoService()
        verified = await media.validate_and_save(photo)
        previous_url = user.profile_photo_url
        try:
            user.profile_photo_url = verified.media_url
            user.profile_photo_verified_at = now
            user.status = AccountStatus.ACTIVE
            self.session.flush()
            self.audit.record(
                actor=user,
                action="member.profile_photo_verified",
                entity_type="user",
                entity_id=user.id,
                previous_value={"profile_photo_url": previous_url},
                new_value={"profile_photo_url": user.profile_photo_url},
            )
            self.audit.record(
                actor=user,
                action="user.activated",
                entity_type="user",
                entity_id=user.id,
                new_value={
                    "status": user.status.value,
                    "profile_photo_verified": True,
                },
            )
        except Exception:
            verified.path.unlink(missing_ok=True)
            raise
        return user
