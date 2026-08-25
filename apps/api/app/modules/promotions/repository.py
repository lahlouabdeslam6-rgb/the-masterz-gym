import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.promotions.models import Promotion


class PromotionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, promotion: Promotion) -> Promotion:
        self.session.add(promotion)
        self.session.flush()
        return promotion

    def save(self, promotion: Promotion) -> Promotion:
        self.session.add(promotion)
        self.session.flush()
        return promotion

    def get(self, promotion_id: uuid.UUID) -> Promotion | None:
        return self.session.get(Promotion, promotion_id)

    def by_slug(self, slug: str) -> Promotion | None:
        return self.session.scalar(select(Promotion).where(Promotion.slug == slug))

    def list_admin(self) -> list[Promotion]:
        return list(
            self.session.scalars(
                select(Promotion).order_by(Promotion.created_at.desc(), Promotion.title)
            )
        )

    def list_current(self, now: datetime) -> list[Promotion]:
        return list(
            self.session.scalars(
                select(Promotion)
                .where(
                    Promotion.is_active.is_(True),
                    Promotion.starts_at <= now,
                    Promotion.ends_at >= now,
                )
                .order_by(Promotion.is_featured.desc(), Promotion.ends_at, Promotion.title)
            )
        )

    def current_by_slug(self, slug: str, now: datetime) -> Promotion | None:
        return self.session.scalar(
            select(Promotion).where(
                Promotion.slug == slug,
                Promotion.is_active.is_(True),
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
        )

    def current_featured(self, now: datetime) -> Promotion | None:
        return self.session.scalar(
            select(Promotion)
            .where(
                Promotion.is_active.is_(True),
                Promotion.is_featured.is_(True),
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
            .order_by(Promotion.updated_at.desc())
            .limit(1)
        )

    def clear_featured(self, *, except_id: uuid.UUID | None = None) -> None:
        statement = update(Promotion).where(Promotion.is_featured.is_(True))
        if except_id:
            statement = statement.where(Promotion.id != except_id)
        self.session.execute(statement.values(is_featured=False))
