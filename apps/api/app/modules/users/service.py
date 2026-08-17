import uuid

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.core.security import hash_password
from app.modules.audit.service import AuditService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    MemberProfileUpdate,
    UserAdminUpdate,
    UserCreate,
    UserUpdateRoleStatus,
)
from app.shared.enums import AccountStatus, UserRole


class UserService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    def create(self, data: UserCreate, actor: User) -> User:
        if data.role == UserRole.MEMBER and not data.member_number:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_number_required",
                "Le numéro de membre est requis pour un membre.",
            )
        user = User(
            **data.model_dump(exclude={"password"}),
            password_hash=hash_password(data.password),
        )
        try:
            self.users.add(user)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT, "user_conflict", "Utilisateur déjà existant."
            ) from exc
        self.audit.record(
            actor=actor,
            action="user.created",
            entity_type="user",
            entity_id=user.id,
            new_value={"role": user.role.value, "status": user.status.value},
        )
        return user

    def update_role_status(
        self, user_id: uuid.UUID, data: UserUpdateRoleStatus, actor: User
    ) -> User:
        user = self.users.get(user_id)
        if not user:
            raise api_error(status.HTTP_404_NOT_FOUND, "user_not_found", "Utilisateur introuvable.")
        previous = {"role": user.role.value, "status": user.status.value}
        if data.role is not None:
            user.role = data.role
        if data.status is not None:
            user.status = data.status
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="user.role_status_changed",
            entity_type="user",
            entity_id=user.id,
            previous_value=previous,
            new_value={"role": user.role.value, "status": user.status.value},
            reason=data.reason,
        )
        return user

    def update_as_admin(self, user_id: uuid.UUID, data: UserAdminUpdate, actor: User) -> User:
        user = self.users.get(user_id)
        if not user:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "user_not_found",
                "Utilisateur introuvable.",
            )
        if user.id == actor.id and (
            data.role != UserRole.ADMIN or data.status != AccountStatus.ACTIVE
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "self_admin_lockout",
                "Vous ne pouvez pas retirer votre propre acces administrateur.",
            )
        if data.role == UserRole.MEMBER and not data.member_number:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "member_number_required",
                "Le numero de membre est requis pour un membre.",
            )

        previous = {
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "role": user.role.value,
            "status": user.status.value,
            "member_number": user.member_number,
        }
        user.full_name = data.full_name
        user.phone = data.phone
        user.email = str(data.email) if data.email else None
        user.role = data.role
        user.status = data.status
        user.member_number = data.member_number
        if data.password:
            user.password_hash = hash_password(data.password)
        try:
            self.session.flush()
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "user_conflict",
                "Ce telephone ou numero membre est deja utilise.",
            ) from exc

        self.audit.record(
            actor=actor,
            action="user.updated",
            entity_type="user",
            entity_id=user.id,
            previous_value=previous,
            new_value={
                "full_name": user.full_name,
                "phone": user.phone,
                "email": user.email,
                "role": user.role.value,
                "status": user.status.value,
                "member_number": user.member_number,
                "password_changed": bool(data.password),
            },
            reason=data.reason,
        )
        return user

    def delete(self, user_id: uuid.UUID, actor: User) -> None:
        user = self.users.get(user_id)
        if not user:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "user_not_found",
                "Utilisateur introuvable.",
            )
        if user.id == actor.id:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "self_delete_forbidden",
                "Vous ne pouvez pas supprimer votre propre compte.",
            )

        previous = {
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value,
            "status": user.status.value,
            "member_number": user.member_number,
        }
        try:
            self.users.delete(user)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "user_has_business_data",
                "Ce compte contient des donnees liees. Desactivez-le au lieu de le supprimer.",
            ) from exc
        self.audit.record(
            actor=actor,
            action="user.deleted",
            entity_type="user",
            entity_id=user_id,
            previous_value=previous,
            reason="Suppression depuis la gestion des utilisateurs",
        )

    def update_member_profile(
        self, user_id: uuid.UUID, data: MemberProfileUpdate, actor: User
    ) -> User:
        user = self.users.get(user_id)
        if not user or user.role != UserRole.MEMBER:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "member_not_found",
                "Membre introuvable.",
            )

        previous = {
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
            "gender": user.gender.value if user.gender else None,
        }
        changes = data.model_dump(exclude={"reason"})
        for field, value in changes.items():
            setattr(user, field, value)
        try:
            self.session.flush()
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_profile_conflict",
                "Ce telephone est deja utilise par un autre compte.",
            ) from exc

        self.audit.record(
            actor=actor,
            action="member.profile_updated",
            entity_type="user",
            entity_id=user.id,
            previous_value=previous,
            new_value={
                "full_name": user.full_name,
                "phone": user.phone,
                "email": user.email,
                "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
                "gender": user.gender.value if user.gender else None,
            },
            reason=data.reason,
        )
        return user
