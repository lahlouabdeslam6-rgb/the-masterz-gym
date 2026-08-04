import uuid

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.core.security import hash_password
from app.modules.audit.service import AuditService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserCreate, UserUpdateRoleStatus
from app.shared.enums import UserRole


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
