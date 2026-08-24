import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.models import AuditLog
from app.modules.audit.repository import AuditRepository
from app.modules.audit.service import AuditService
from app.modules.memberships.service import MembershipService
from app.modules.notifications.service import NotificationService
from app.modules.store.models import StoreProduct, StoreReservation, StoreSale
from app.modules.store.repository import StoreRepository
from app.modules.store.schemas import (
    StoreCatalogProductRead,
    StoreInventorySummaryRead,
    StoreProductCreate,
    StoreProductRead,
    StoreProductUpdate,
    StoreReservationCreate,
    StoreReservationRead,
    StoreReservationStatusUpdate,
    StoreSaleCreate,
    StoreSaleRead,
    StoreStockMovementRead,
)
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import StoreReservationStatus, UserRole

ALLOWED_TRANSITIONS = {
    StoreReservationStatus.PENDING: {
        StoreReservationStatus.READY,
        StoreReservationStatus.REJECTED,
        StoreReservationStatus.CANCELLED,
    },
    StoreReservationStatus.READY: {
        StoreReservationStatus.COMPLETED,
        StoreReservationStatus.REJECTED,
        StoreReservationStatus.CANCELLED,
    },
    StoreReservationStatus.REJECTED: set(),
    StoreReservationStatus.COMPLETED: set(),
    StoreReservationStatus.CANCELLED: set(),
}


class StoreService:
    def __init__(self, session: Session) -> None:
        self.store = StoreRepository(session)
        self.users = UserRepository(session)
        self.notifications = NotificationService(session)
        self.audit = AuditService(session)
        self.audit_repository = AuditRepository(session)
        self.memberships = MembershipService(session)

    def list_products(self, actor: User, *, active_only: bool) -> list[StoreProductRead]:
        if actor.role != UserRole.ADMIN:
            active_only = True
        return [
            StoreProductRead.model_validate(product)
            for product in self.store.list_products(active_only=active_only)
        ]

    def list_public_catalog(self) -> list[StoreCatalogProductRead]:
        return [
            StoreCatalogProductRead(
                id=product.id,
                name=product.name,
                description=product.description,
                image_url=product.image_url,
                media_urls=product.media_urls,
                price=product.price,
                currency=product.currency,
                is_available=product.stock_quantity > 0,
            )
            for product in self.store.list_products(active_only=True)
        ]

    def inventory_summary(self) -> StoreInventorySummaryRead:
        products = self.store.list_products(active_only=True)
        threshold = self.memberships.get_setting_int("store_low_stock_threshold")
        return StoreInventorySummaryRead(
            low_stock_threshold=threshold,
            total_units=sum(product.stock_quantity for product in products),
            low_stock_products=[
                StoreProductRead.model_validate(product)
                for product in products
                if product.stock_quantity <= threshold
            ],
        )

    def list_stock_movements(self, *, limit: int) -> list[StoreStockMovementRead]:
        actions = {
            "store.product.created",
            "store.product.updated",
            "store.reservation.status_updated",
            "store.sale.recorded",
        }
        audit_entries = self.audit_repository.list_actions(
            actions,
            limit=min(limit * 4, 500),
        )
        movements: list[StoreStockMovementRead] = []
        for entry in audit_entries:
            movement = self._stock_movement_read(entry)
            if movement:
                movements.append(movement)
            if len(movements) == limit:
                break
        return movements

    def create_product(self, data: StoreProductCreate, actor: User) -> StoreProductRead:
        media_urls = self._media_urls(data.image_url, data.media_urls)
        product = self.store.add_product(
            StoreProduct(
                name=data.name.strip(),
                description=(data.description or "").strip() or None,
                image_url=media_urls[0] if media_urls else None,
                media_urls=media_urls,
                price=data.price,
                currency=data.currency.upper(),
                stock_quantity=data.stock_quantity,
                is_active=data.is_active,
            )
        )
        self.audit.record(
            actor=actor,
            action="store.product.created",
            entity_type="store_product",
            entity_id=product.id,
            new_value={
                "name": product.name,
                "price": str(product.price),
                "currency": product.currency,
                "stock_quantity": product.stock_quantity,
                "is_active": product.is_active,
            },
        )
        return StoreProductRead.model_validate(product)

    def update_product(
        self, product_id: uuid.UUID, data: StoreProductUpdate, actor: User
    ) -> StoreProductRead:
        product = self.store.get_product_for_update(product_id)
        if not product:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "store_product_not_found",
                "Produit introuvable.",
            )
        previous = {
            "name": product.name,
            "price": str(product.price),
            "currency": product.currency,
            "stock_quantity": product.stock_quantity,
            "is_active": product.is_active,
        }
        changes = data.model_dump(exclude_unset=True)
        if "media_urls" in changes:
            media_urls = self._media_urls(changes.get("image_url"), changes.pop("media_urls"))
            product.media_urls = media_urls
            product.image_url = media_urls[0] if media_urls else None
            changes.pop("image_url", None)
        elif "image_url" in changes:
            media_urls = self._media_urls(changes.pop("image_url"), [])
            product.media_urls = media_urls
            product.image_url = media_urls[0] if media_urls else None
        for field, value in changes.items():
            if field in {"name", "description", "image_url"} and isinstance(value, str):
                value = value.strip() or None
            if field == "currency" and value:
                value = value.upper()
            setattr(product, field, value)
        self.store.save_product(product)
        self.audit.record(
            actor=actor,
            action="store.product.updated",
            entity_type="store_product",
            entity_id=product.id,
            previous_value=previous,
            new_value={
                "name": product.name,
                "price": str(product.price),
                "currency": product.currency,
                "stock_quantity": product.stock_quantity,
                "is_active": product.is_active,
            },
        )
        return StoreProductRead.model_validate(product)

    def create_reservation(self, data: StoreReservationCreate, actor: User) -> StoreReservationRead:
        product = self.store.get_product(data.product_id)
        if not product or not product.is_active:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "store_product_not_available",
                "Ce produit n'est pas disponible.",
            )
        if data.quantity > product.stock_quantity:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "store_insufficient_stock",
                "Le stock disponible est insuffisant.",
            )
        reservation = self.store.add_reservation(
            StoreReservation(
                product_id=product.id,
                member_id=actor.id,
                quantity=data.quantity,
                unit_price=product.price,
                currency=product.currency,
                status=StoreReservationStatus.PENDING,
            )
        )
        self.audit.record(
            actor=actor,
            action="store.reservation.created",
            entity_type="store_reservation",
            entity_id=reservation.id,
            new_value={
                "product_id": str(product.id),
                "quantity": reservation.quantity,
                "status": reservation.status.value,
            },
        )
        return self._reservation_read(reservation)

    def list_reservations(self, actor: User, *, limit: int) -> list[StoreReservationRead]:
        return [
            self._reservation_read(reservation)
            for reservation in self.store.list_reservations(actor.id, actor.role, limit=limit)
        ]

    def update_reservation_status(
        self,
        reservation_id: uuid.UUID,
        data: StoreReservationStatusUpdate,
        actor: User,
    ) -> StoreReservationRead:
        reservation = self.store.get_reservation_for_update(reservation_id)
        if not reservation:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "store_reservation_not_found",
                "Reservation introuvable.",
            )
        current_status = StoreReservationStatus(reservation.status)
        if data.status == current_status:
            return self._reservation_read(reservation)
        if data.status not in ALLOWED_TRANSITIONS[current_status]:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "store_reservation_transition_invalid",
                "Ce changement de statut n'est pas autorise.",
            )

        product = self.store.get_product_for_update(reservation.product_id)
        if not product:
            raise RuntimeError("Reservation sans produit.")
        previous_stock = product.stock_quantity
        if (
            current_status == StoreReservationStatus.PENDING
            and data.status == StoreReservationStatus.READY
        ):
            self._ensure_stock(product, reservation.quantity)
            product.stock_quantity -= reservation.quantity
        elif current_status == StoreReservationStatus.READY and data.status in {
            StoreReservationStatus.REJECTED,
            StoreReservationStatus.CANCELLED,
        }:
            product.stock_quantity += reservation.quantity

        if data.status == StoreReservationStatus.COMPLETED:
            member = self.users.get(reservation.member_id)
            if not member or not data.payment_method:
                raise RuntimeError("Reservation terminee sans membre ou paiement.")
            existing_sale = self.store.sale_by_key(f"store-reservation:{reservation.id}")
            if not existing_sale:
                self.store.add_sale(
                    StoreSale(
                        idempotency_key=f"store-reservation:{reservation.id}",
                        product_id=product.id,
                        reservation_id=reservation.id,
                        member_id=member.id,
                        buyer_name=member.full_name,
                        quantity=reservation.quantity,
                        unit_price=reservation.unit_price,
                        total_amount=reservation.unit_price * reservation.quantity,
                        currency=reservation.currency,
                        payment_method=data.payment_method,
                        recorded_by_id=actor.id,
                    )
                )

        reservation.status = data.status
        reservation.notes = (data.notes or "").strip() or None
        reservation.processed_by_id = actor.id
        reservation.processed_at = datetime.now(UTC)
        self.store.save_product(product)
        self.store.save_reservation(reservation)
        member = self.users.get(reservation.member_id)
        if member:
            self.notifications.store_reservation_status(
                member,
                reservation_id=reservation.id,
                product_name=product.name,
                reservation_status=data.status,
            )
        self.audit.record(
            actor=actor,
            action="store.reservation.status_updated",
            entity_type="store_reservation",
            entity_id=reservation.id,
            previous_value={
                "status": current_status.value,
                "stock_quantity": previous_stock,
            },
            new_value={
                "status": data.status.value,
                "stock_quantity": product.stock_quantity,
            },
            reason=reservation.notes,
        )
        return self._reservation_read(reservation)

    def record_sale(self, data: StoreSaleCreate, actor: User) -> StoreSaleRead:
        self.store.lock_sale_key(data.idempotency_key)
        existing = self.store.sale_by_key(data.idempotency_key)
        if existing:
            return self._sale_read(existing)
        product = self.store.get_product_for_update(data.product_id)
        if not product or not product.is_active:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "store_product_not_available",
                "Ce produit n'est pas disponible.",
            )
        self._ensure_stock(product, data.quantity)
        member = self.users.get(data.member_id) if data.member_id else None
        if data.member_id and (not member or member.role != UserRole.MEMBER):
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "member_not_found",
                "Membre introuvable.",
            )
        buyer_name = member.full_name if member else (data.buyer_name or "").strip()
        previous_stock = product.stock_quantity
        product.stock_quantity -= data.quantity
        sale = self.store.add_sale(
            StoreSale(
                idempotency_key=data.idempotency_key,
                product_id=product.id,
                reservation_id=None,
                member_id=member.id if member else None,
                buyer_name=buyer_name,
                quantity=data.quantity,
                unit_price=product.price,
                total_amount=product.price * data.quantity,
                currency=product.currency,
                payment_method=data.payment_method,
                recorded_by_id=actor.id,
            )
        )
        self.store.save_product(product)
        self.audit.record(
            actor=actor,
            action="store.sale.recorded",
            entity_type="store_sale",
            entity_id=sale.id,
            new_value={
                "product_id": str(product.id),
                "quantity": sale.quantity,
                "total_amount": str(sale.total_amount),
                "currency": sale.currency,
                "stock_before": previous_stock,
                "stock_after": product.stock_quantity,
            },
        )
        return self._sale_read(sale)

    def list_sales(self, *, limit: int) -> list[StoreSaleRead]:
        return [self._sale_read(sale) for sale in self.store.list_sales(limit=limit)]

    def _ensure_stock(self, product: StoreProduct, quantity: int) -> None:
        if quantity > product.stock_quantity:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "store_insufficient_stock",
                "Le stock disponible est insuffisant.",
            )

    def _stock_movement_read(self, entry: AuditLog) -> StoreStockMovementRead | None:
        previous_value = entry.previous_value or {}
        new_value = entry.new_value or {}
        product_id: uuid.UUID | None = None
        movement_type: str | None = None
        stock_before: int | None = None
        stock_after: int | None = None

        try:
            if entry.action == "store.product.created":
                product_id = uuid.UUID(entry.entity_id)
                movement_type = "initial_stock"
                stock_before = 0
                stock_after = int(new_value["stock_quantity"])
            elif entry.action == "store.product.updated":
                product_id = uuid.UUID(entry.entity_id)
                movement_type = "manual_adjustment"
                stock_before = int(previous_value["stock_quantity"])
                stock_after = int(new_value["stock_quantity"])
            elif entry.action == "store.reservation.status_updated":
                reservation = self.store.get_reservation(uuid.UUID(entry.entity_id))
                if not reservation:
                    return None
                product_id = reservation.product_id
                stock_before = int(previous_value["stock_quantity"])
                stock_after = int(new_value["stock_quantity"])
                movement_type = (
                    "reservation_hold" if stock_after < stock_before else "reservation_release"
                )
            elif entry.action == "store.sale.recorded":
                product_id = uuid.UUID(str(new_value["product_id"]))
                movement_type = "direct_sale"
                stock_before = int(new_value["stock_before"])
                stock_after = int(new_value["stock_after"])
        except (KeyError, TypeError, ValueError):
            return None

        if (
            product_id is None
            or movement_type is None
            or stock_before is None
            or stock_after is None
            or stock_before == stock_after
        ):
            return None
        product = self.store.get_product(product_id)
        if not product:
            return None
        actor = self.users.get(entry.actor_id) if entry.actor_id else None
        return StoreStockMovementRead(
            id=entry.id,
            product_id=product.id,
            product_name=product.name,
            movement_type=movement_type,
            quantity_delta=stock_after - stock_before,
            stock_before=stock_before,
            stock_after=stock_after,
            actor_id=entry.actor_id,
            actor_name=actor.full_name if actor else "Systeme",
            source_type=entry.entity_type,
            source_id=entry.entity_id,
            reason=entry.reason,
            created_at=entry.created_at,
        )

    @staticmethod
    def _media_urls(image_url: str | None, media_urls: list[str]) -> list[str]:
        normalized = [url.strip() for url in media_urls if url.strip()]
        cover_url = (image_url or "").strip()
        if cover_url and cover_url not in normalized:
            normalized.insert(0, cover_url)
        return list(dict.fromkeys(normalized))

    def _reservation_read(self, reservation: StoreReservation) -> StoreReservationRead:
        product = self.store.get_product(reservation.product_id)
        member = self.users.get(reservation.member_id)
        employee = (
            self.users.get(reservation.processed_by_id) if reservation.processed_by_id else None
        )
        if not product or not member:
            raise RuntimeError("Reservation Store incomplete.")
        return StoreReservationRead(
            id=reservation.id,
            product_id=product.id,
            product_name=product.name,
            product_image_url=product.image_url,
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            member_phone=member.phone,
            quantity=reservation.quantity,
            unit_price=reservation.unit_price,
            total_amount=reservation.unit_price * reservation.quantity,
            currency=reservation.currency,
            status=reservation.status,
            processed_by_id=reservation.processed_by_id,
            processed_by_name=employee.full_name if employee else None,
            processed_at=reservation.processed_at,
            notes=reservation.notes,
            created_at=reservation.created_at,
            updated_at=reservation.updated_at,
        )

    def _sale_read(self, sale: StoreSale) -> StoreSaleRead:
        product = self.store.get_product(sale.product_id)
        employee = self.users.get(sale.recorded_by_id)
        if not product or not employee:
            raise RuntimeError("Vente Store incomplete.")
        return StoreSaleRead(
            id=sale.id,
            product_id=product.id,
            reservation_id=sale.reservation_id,
            product_name=product.name,
            member_id=sale.member_id,
            buyer_name=sale.buyer_name,
            quantity=sale.quantity,
            unit_price=sale.unit_price,
            total_amount=sale.total_amount,
            currency=sale.currency,
            payment_method=sale.payment_method,
            recorded_by_id=employee.id,
            recorded_by_name=employee.full_name,
            created_at=sale.created_at,
        )
