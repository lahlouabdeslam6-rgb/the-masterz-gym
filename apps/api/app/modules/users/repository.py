from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.users.models import User
from app.shared.enums import UserRole


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: uuid.UUID) -> User | None:
        return self.session.get(User, user_id)

    def by_phone(self, phone: str) -> User | None:
        return self.session.scalar(select(User).where(User.phone == phone))

    def by_member_number(self, member_number: str) -> User | None:
        return self.session.scalar(select(User).where(User.member_number == member_number))

    def add(self, user: User) -> User:
        self.session.add(user)
        self.session.flush()
        return user

    def delete(self, user: User) -> None:
        self.session.delete(user)
        self.session.flush()

    def list(self, *, limit: int = 100) -> list[User]:
        return list(
            self.session.scalars(select(User).order_by(User.created_at.desc()).limit(limit))
        )

    def search_members(self, query: str, *, limit: int = 20) -> list[User]:
        pattern = f"%{query.strip()}%"
        statement = (
            select(User)
            .where(
                User.role == UserRole.MEMBER,
                or_(
                    User.full_name.ilike(pattern),
                    User.phone.ilike(pattern),
                    User.member_number.ilike(pattern),
                ),
            )
            .order_by(User.full_name)
            .limit(limit)
        )
        return list(self.session.scalars(statement))
