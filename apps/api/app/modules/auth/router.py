import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.config import settings
from app.core.dependencies import CurrentUser, DbSession
from app.modules.auth.otp import OTPProvider, get_otp_provider
from app.modules.auth.schemas import (
    ExistingMemberActivationConfirm,
    ExistingMemberActivationRequest,
    GenericOTPResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    OTPRequest,
    PasswordChangeRequest,
    PasswordResetConfirm,
    RefreshRequest,
    TokenPair,
)
from app.modules.auth.service import AuthService
from app.shared.enums import OTPPurpose

router = APIRouter(prefix="/auth", tags=["Authentication"])
OTPDependency = Annotated[OTPProvider, Depends(get_otp_provider)]


def service(session: DbSession, otp_provider: OTPDependency) -> AuthService:
    return AuthService(session, otp_provider)


@router.post("/login", response_model=TokenPair)
def login(data: LoginRequest, auth: Annotated[AuthService, Depends(service)]) -> TokenPair:
    return auth.login(data.phone, data.password)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, auth: Annotated[AuthService, Depends(service)]) -> TokenPair:
    return auth.refresh(data.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(
    data: LogoutRequest,
    actor: CurrentUser,
    auth: Annotated[AuthService, Depends(service)],
) -> MessageResponse:
    auth.logout(data.refresh_token, actor)
    return MessageResponse(message="Déconnexion effectuée.")


@router.patch("/password", response_model=MessageResponse)
def change_password(
    data: PasswordChangeRequest,
    actor: CurrentUser,
    auth: Annotated[AuthService, Depends(service)],
) -> MessageResponse:
    auth.change_password(actor, data.current_password, data.new_password)
    return MessageResponse(message="Mot de passe mis à jour.")


@router.post(
    "/password-reset/request",
    response_model=GenericOTPResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_password_reset(
    data: OTPRequest, auth: Annotated[AuthService, Depends(service)]
) -> GenericOTPResponse:
    challenge = auth.request_password_reset(data.phone)
    return GenericOTPResponse(
        message="Si les informations correspondent, un code a été envoyé.",
        challenge_id=challenge.id,
        expires_in=settings.otp_expiry_minutes * 60,
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_password_reset(
    data: PasswordResetConfirm, auth: Annotated[AuthService, Depends(service)]
) -> MessageResponse:
    auth.confirm_otp_password(
        data.challenge_id, data.otp, data.new_password, OTPPurpose.PASSWORD_RESET
    )
    return MessageResponse(message="Mot de passe mis à jour.")


@router.post(
    "/member-activation/request",
    response_model=GenericOTPResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_member_activation(
    data: ExistingMemberActivationRequest,
    auth: Annotated[AuthService, Depends(service)],
) -> GenericOTPResponse:
    challenge = auth.request_member_activation(data)
    return GenericOTPResponse(
        message="Si les informations correspondent, un code a été envoyé.",
        challenge_id=challenge.id,
        expires_in=settings.otp_expiry_minutes * 60,
    )


@router.post("/member-activation/confirm", response_model=MessageResponse)
def confirm_member_activation(
    data: ExistingMemberActivationConfirm,
    auth: Annotated[AuthService, Depends(service)],
) -> MessageResponse:
    auth.confirm_otp_password(
        data.challenge_id,
        data.otp,
        data.new_password,
        OTPPurpose.EXISTING_MEMBER_ACTIVATION,
    )
    return MessageResponse(message="Identite verifiee. Ajoutez maintenant votre photo de visage.")


@router.post("/member-activation/photo", response_model=MessageResponse)
async def complete_member_activation(
    challenge_id: Annotated[uuid.UUID, Form()],
    photo: Annotated[UploadFile, File()],
    auth: Annotated[AuthService, Depends(service)],
) -> MessageResponse:
    await auth.complete_member_activation(challenge_id, photo)
    return MessageResponse(message="Compte active. Vous pouvez maintenant vous connecter.")
