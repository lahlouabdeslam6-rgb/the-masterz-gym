from datetime import date

from sqlalchemy import CheckConstraint, Date, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.enums import AccountStatus, Gender, UserRole
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role != 'MEMBER' OR member_number IS NOT NULL",
            name="ck_users_member_number_for_member_role",
        ),
    )

    full_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, name="gender"), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status"), nullable=False
    )
    member_number: Mapped[str | None] = mapped_column(
        String(40), nullable=True, unique=True, index=True
    )

    @property
    def is_member(self) -> bool:
        return self.role == UserRole.MEMBER or self.member_number is not None
