import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.clubs.constants import SALLE_1_ID
from app.shared.models import TimestampMixin, UUIDPrimaryKeyMixin


class CafeMenuItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cafe_menu_items"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_cafe_menu_items_positive_price"),
        CheckConstraint("display_order >= 0", name="ck_cafe_menu_items_display_order"),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id"),
        nullable=False,
        default=SALLE_1_ID,
        server_default=str(SALLE_1_ID),
        index=True,
    )
    category: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_urls: Mapped[list[str]] = mapped_column(
        ARRAY(String(500)), nullable=False, default=list, server_default="{}"
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MAD")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true", index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
