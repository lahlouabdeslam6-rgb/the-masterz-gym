import re
import unicodedata
import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.memberships.repository import MembershipRepository
from app.modules.promotions.models import Promotion
from app.modules.promotions.repository import PromotionRepository
from app.modules.promotions.schemas import PromotionCreate, PromotionRead, PromotionUpdate
from app.modules.users.models import User
from app.shared.enums import ServiceType


class PromotionService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.promotions = PromotionRepository(session)
        self.memberships = MembershipRepository(session)
        self.audit = AuditService(session)

    def list_admin(self) -> list[PromotionRead]:
        return [self._read(item) for item in self.promotions.list_admin()]

    def list_current(self) -> list[PromotionRead]:
        now = datetime.now(UTC)
        return [self._read(item) for item in self.promotions.list_current(now)]

    def featured(self) -> PromotionRead | None:
        promotion = self.promotions.current_featured(datetime.now(UTC))
        return self._read(promotion) if promotion else None

    def current_by_slug(self, slug: str) -> PromotionRead:
        promotion = self.promotions.current_by_slug(slug, datetime.now(UTC))
        if not promotion:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "promotion_not_found",
                "Cette offre n'est pas disponible.",
            )
        return self._read(promotion)

    def available_for_application(self, promotion_id: uuid.UUID) -> Promotion:
        promotion = self.promotions.get(promotion_id)
        now = datetime.now(UTC)
        if (
            not promotion
            or not promotion.is_active
            or promotion.starts_at > now
            or promotion.ends_at < now
        ):
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "promotion_not_available",
                "Cette offre n'est plus disponible.",
            )
        return promotion

    def create(self, data: PromotionCreate, actor: User) -> PromotionRead:
        self._validate_plan(data.base_plan_id)
        promotion = Promotion(
            **data.model_dump(),
            slug=self._unique_slug(data.title),
            created_by_id=actor.id,
            updated_by_id=actor.id,
        )
        if promotion.is_featured:
            self.promotions.clear_featured()
        self.promotions.add(promotion)
        self.audit.record(
            actor=actor,
            action="promotion.created",
            entity_type="promotion",
            entity_id=promotion.id,
            new_value={
                "title": promotion.title,
                "price": str(promotion.price),
                "participant_count": promotion.participant_count,
                "is_featured": promotion.is_featured,
            },
        )
        return self._read(promotion)

    def update(
        self,
        promotion_id: uuid.UUID,
        data: PromotionUpdate,
        actor: User,
    ) -> PromotionRead:
        promotion = self.promotions.get(promotion_id)
        if not promotion:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "promotion_not_found",
                "Offre introuvable.",
            )
        self._validate_plan(data.base_plan_id)
        previous = {
            "title": promotion.title,
            "price": str(promotion.price),
            "is_active": promotion.is_active,
            "is_featured": promotion.is_featured,
        }
        for field, value in data.model_dump().items():
            setattr(promotion, field, value)
        promotion.updated_by_id = actor.id
        if promotion.is_featured:
            self.promotions.clear_featured(except_id=promotion.id)
        self.promotions.save(promotion)
        self.audit.record(
            actor=actor,
            action="promotion.updated",
            entity_type="promotion",
            entity_id=promotion.id,
            previous_value=previous,
            new_value={
                "title": promotion.title,
                "price": str(promotion.price),
                "is_active": promotion.is_active,
                "is_featured": promotion.is_featured,
            },
        )
        return self._read(promotion)

    def _validate_plan(self, plan_id: uuid.UUID) -> None:
        plan = self.memberships.get_plan(plan_id)
        if not plan or not plan.is_active or plan.service_type != ServiceType.GYM:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "promotion_plan_not_available",
                "Choisissez une formule salle active pour cette offre.",
            )

    def _read(self, promotion: Promotion) -> PromotionRead:
        plan = self.memberships.get_plan(promotion.base_plan_id)
        if not plan:
            raise RuntimeError("Promotion sans formule de base.")
        return PromotionRead.model_validate(promotion).model_copy(
            update={"base_plan_name": plan.name}
        )

    def _unique_slug(self, title: str) -> str:
        normalized = unicodedata.normalize("NFKD", title)
        base = re.sub(r"[^a-z0-9]+", "-", normalized.encode("ascii", "ignore").decode().lower())
        base = base.strip("-") or "offre-masterz"
        candidate = base
        sequence = 2
        while self.promotions.by_slug(candidate):
            candidate = f"{base}-{sequence}"
            sequence += 1
        return candidate
