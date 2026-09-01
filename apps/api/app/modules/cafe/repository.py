import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.cafe.models import CafeMenuItem


class CafeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_items(self, *, active_only: bool) -> list[CafeMenuItem]:
        statement = select(CafeMenuItem)
        if active_only:
            statement = statement.where(CafeMenuItem.is_active.is_(True))
        statement = statement.order_by(
            CafeMenuItem.category,
            CafeMenuItem.display_order,
            CafeMenuItem.name,
        )
        return list(self.session.scalars(statement))

    def get_for_update(self, item_id: uuid.UUID) -> CafeMenuItem | None:
        return self.session.scalar(
            select(CafeMenuItem).where(CafeMenuItem.id == item_id).with_for_update()
        )

    def add(self, item: CafeMenuItem) -> CafeMenuItem:
        self.session.add(item)
        self.session.flush()
        return item

    def save(self, item: CafeMenuItem) -> CafeMenuItem:
        self.session.add(item)
        self.session.flush()
        return item

    def delete(self, item: CafeMenuItem) -> None:
        self.session.delete(item)
        self.session.flush()
