import uuid

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.cafe.models import CafeMenuItem
from app.modules.cafe.repository import CafeRepository
from app.modules.cafe.schemas import CafeMenuItemCreate, CafeMenuItemRead, CafeMenuItemUpdate
from app.modules.users.models import User


class CafeService:
    def __init__(self, session: Session) -> None:
        self.cafe = CafeRepository(session)
        self.audit = AuditService(session)

    def list_public_menu(self) -> list[CafeMenuItemRead]:
        return [
            CafeMenuItemRead.model_validate(item) for item in self.cafe.list_items(active_only=True)
        ]

    def list_admin_menu(self) -> list[CafeMenuItemRead]:
        return [
            CafeMenuItemRead.model_validate(item)
            for item in self.cafe.list_items(active_only=False)
        ]

    def create(self, data: CafeMenuItemCreate, actor: User) -> CafeMenuItemRead:
        item = self.cafe.add(
            CafeMenuItem(
                **data.model_dump(),
                created_by_id=actor.id,
                updated_by_id=actor.id,
            )
        )
        self.audit.record(
            actor=actor,
            action="cafe.menu_item.created",
            entity_type="cafe_menu_item",
            entity_id=item.id,
            new_value=self._audit_value(item),
        )
        return CafeMenuItemRead.model_validate(item)

    def update(
        self,
        item_id: uuid.UUID,
        data: CafeMenuItemUpdate,
        actor: User,
    ) -> CafeMenuItemRead:
        item = self.cafe.get_for_update(item_id)
        if not item:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "cafe_menu_item_not_found",
                "Article Healthy Cafe introuvable.",
            )
        previous = self._audit_value(item)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        item.updated_by_id = actor.id
        self.cafe.save(item)
        self.audit.record(
            actor=actor,
            action="cafe.menu_item.updated",
            entity_type="cafe_menu_item",
            entity_id=item.id,
            previous_value=previous,
            new_value=self._audit_value(item),
        )
        return CafeMenuItemRead.model_validate(item)

    @staticmethod
    def _audit_value(item: CafeMenuItem) -> dict[str, object]:
        return {
            "name": item.name,
            "category": item.category,
            "price": str(item.price),
            "currency": item.currency,
            "display_order": item.display_order,
            "is_active": item.is_active,
        }
