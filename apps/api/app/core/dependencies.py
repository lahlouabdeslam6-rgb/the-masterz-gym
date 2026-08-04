import uuid
from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import unauthorized
from app.core.security import decode_jwt
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import AccountStatus, UserRole

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    session: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise unauthorized()
    try:
        payload = decode_jwt(credentials.credentials, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise unauthorized() from exc
    user = UserRepository(session).get(user_id)
    if not user or user.status != AccountStatus.ACTIVE:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[CurrentUser], User]:
    def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            from fastapi import status

            from app.core.errors import api_error

            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "permission_denied",
                "Vous n'avez pas la permission d'effectuer cette action.",
            )
        return user

    return dependency
