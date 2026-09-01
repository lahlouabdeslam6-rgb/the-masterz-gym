import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.clubs.constants import SALLE_1_ID
from app.shared.models import UUIDPrimaryKeyMixin


class RecoveryVisit(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recovery_visits"
    __table_args__ = (
        CheckConstraint(
            "sauna_used OR cold_bath_used OR compression_used",
            name="ck_recovery_visits_service_selected",
        ),
        CheckConstraint(
            "remaining_sessions_after >= 0",
            name="ck_recovery_visits_remaining_non_negative",
        ),
        UniqueConstraint("idempotency_key"),
    )

    idempotency_key: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id"),
        nullable=False,
        default=SALLE_1_ID,
        server_default=str(SALLE_1_ID),
        index=True,
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False, index=True
    )
    recorded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    sauna_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cold_bath_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    compression_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    remaining_sessions_after: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
