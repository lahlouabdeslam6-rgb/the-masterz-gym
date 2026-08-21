import uuid

from sqlalchemy import case, select, text
from sqlalchemy.orm import Session

from app.modules.store.models import StoreProduct, StoreReservation, StoreSale
from app.shared.enums import UserRole


class StoreRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_products(self, *, active_only: bool) -> list[StoreProduct]:
        statement = select(StoreProduct).order_by(StoreProduct.is_active.desc(), StoreProduct.name)
        if active_only:
            statement = statement.where(StoreProduct.is_active.is_(True))
        return list(self.session.scalars(statement))

    def get_product(self, product_id: uuid.UUID) -> StoreProduct | None:
        return self.session.get(StoreProduct, product_id)

    def get_product_for_update(self, product_id: uuid.UUID) -> StoreProduct | None:
        return self.session.scalar(
            select(StoreProduct).where(StoreProduct.id == product_id).with_for_update()
        )

    def add_product(self, product: StoreProduct) -> StoreProduct:
        self.session.add(product)
        self.session.flush()
        return product

    def save_product(self, product: StoreProduct) -> StoreProduct:
        self.session.add(product)
        self.session.flush()
        return product

    def add_reservation(self, reservation: StoreReservation) -> StoreReservation:
        self.session.add(reservation)
        self.session.flush()
        return reservation

    def get_reservation(self, reservation_id: uuid.UUID) -> StoreReservation | None:
        return self.session.get(StoreReservation, reservation_id)

    def get_reservation_for_update(self, reservation_id: uuid.UUID) -> StoreReservation | None:
        return self.session.scalar(
            select(StoreReservation).where(StoreReservation.id == reservation_id).with_for_update()
        )

    def save_reservation(self, reservation: StoreReservation) -> StoreReservation:
        self.session.add(reservation)
        self.session.flush()
        return reservation

    def list_reservations(
        self, actor_id: uuid.UUID, actor_role: UserRole, *, limit: int
    ) -> list[StoreReservation]:
        statement = select(StoreReservation).order_by(
            case((StoreReservation.status == "pending", 0), else_=1),
            StoreReservation.created_at.desc(),
        )
        if actor_role == UserRole.MEMBER:
            statement = statement.where(StoreReservation.member_id == actor_id)
        return list(self.session.scalars(statement.limit(limit)))

    def lock_sale_key(self, key: str) -> None:
        self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"store-sale:{key}"},
        )

    def sale_by_key(self, key: str) -> StoreSale | None:
        return self.session.scalar(select(StoreSale).where(StoreSale.idempotency_key == key))

    def add_sale(self, sale: StoreSale) -> StoreSale:
        self.session.add(sale)
        self.session.flush()
        return sale

    def list_sales(self, *, limit: int) -> list[StoreSale]:
        return list(
            self.session.scalars(
                select(StoreSale).order_by(StoreSale.created_at.desc()).limit(limit)
            )
        )
