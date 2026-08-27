import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.memberships.models import Subscription
from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository
from app.modules.users.models import User
from app.shared.enums import (
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    StoreReservationStatus,
)


class NotificationService:
    def __init__(self, session: Session) -> None:
        self.repository = NotificationRepository(session)

    def list_for_user(
        self, user: User, *, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        return self.repository.list_for_user(user.id, unread_only=unread_only, limit=limit)

    def mark_read(self, notification_id: uuid.UUID, user: User) -> Notification:
        notification = self.repository.get_for_user(notification_id, user.id)
        if not notification:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "notification_not_found",
                "Notification introuvable.",
            )
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
        return self.repository.save(notification)

    def recovery_pack_exhausted(self, member: User, subscription: Subscription) -> Notification:
        deduplication_key = f"recovery_pack_exhausted:{subscription.id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="recovery_pack_exhausted",
                title="Vos seances Recovery sont terminees",
                body=(
                    f"Vous avez utilise la derniere seance de votre pack "
                    f"{subscription.plan_name}. Contactez la reception pour le renouveler."
                ),
                deduplication_key=deduplication_key,
            )
        )

    def complaint_reply(
        self,
        member: User,
        *,
        complaint_id: uuid.UUID,
        message_id: uuid.UUID,
        subject: str,
    ) -> Notification:
        deduplication_key = f"complaint_reply:{message_id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="complaint_reply",
                title="Nouvelle reponse a votre reclamation",
                body=(
                    f"L'equipe Masterz a repondu a votre reclamation: {subject}. "
                    "Ouvrez votre espace membre pour consulter la conversation."
                ),
                deduplication_key=deduplication_key,
            )
        )

    def store_reservation_status(
        self,
        member: User,
        *,
        reservation_id: uuid.UUID,
        product_name: str,
        reservation_status: StoreReservationStatus,
    ) -> Notification:
        messages = {
            StoreReservationStatus.READY: (
                "Produit disponible",
                f"Votre reservation de {product_name} est disponible. "
                "Vous pouvez la recuperer a la reception.",
            ),
            StoreReservationStatus.REJECTED: (
                "Reservation non disponible",
                f"Votre reservation de {product_name} n'a pas pu etre validee. "
                "Contactez la reception pour plus d'informations.",
            ),
            StoreReservationStatus.CANCELLED: (
                "Reservation annulee",
                f"Votre reservation de {product_name} a ete annulee.",
            ),
            StoreReservationStatus.COMPLETED: (
                "Produit recupere",
                f"Votre reservation de {product_name} est terminee.",
            ),
        }
        if reservation_status not in messages:
            raise ValueError("Statut Store sans notification.")
        title, body = messages[reservation_status]
        deduplication_key = f"store_reservation:{reservation_id}:{reservation_status.value}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="store_reservation_update",
                title=title,
                body=body,
                deduplication_key=deduplication_key,
            )
        )

    def coaching_booking_requested(
        self,
        coach: User,
        *,
        booking_id: uuid.UUID,
        member: User,
        starts_at: datetime,
    ) -> Notification:
        deduplication_key = f"coaching_booking_requested:{booking_id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=coach.id,
                kind="coaching_booking_requested",
                title="Nouvelle reservation coaching",
                body=(
                    f"{member.full_name} a demande une seance le "
                    f"{starts_at.isoformat()}. Confirmez-la depuis votre planning."
                ),
                deduplication_key=deduplication_key,
            )
        )

    def coaching_assignment_request_decision(
        self,
        member: User,
        *,
        request_id: uuid.UUID,
        request_status: CoachingAssignmentRequestStatus,
        coach_name: str | None,
    ) -> Notification:
        if request_status == CoachingAssignmentRequestStatus.APPROVED and coach_name:
            title = "Votre coach est confirme"
            body = (
                f"{coach_name} est maintenant votre coach. "
                "Vous pouvez consulter ses horaires et reserver une seance."
            )
        elif request_status == CoachingAssignmentRequestStatus.REJECTED:
            title = "Demande de coach mise a jour"
            body = (
                "Votre demande n'a pas pu etre validee. "
                "Consultez votre espace Coaching pour voir le motif et refaire un choix."
            )
        else:
            raise ValueError("Statut de demande coaching sans notification.")
        deduplication_key = f"coaching_assignment_request:{request_id}:{request_status.value}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="coaching_assignment_request_update",
                title=title,
                body=body,
                deduplication_key=deduplication_key,
            )
        )

    def coaching_member_assigned(
        self,
        coach: User,
        *,
        request_id: uuid.UUID,
        member: User,
    ) -> Notification:
        deduplication_key = f"coaching_member_assigned:{request_id}:{coach.id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=coach.id,
                kind="coaching_member_assigned",
                title="Nouveau client coaching",
                body=(
                    f"{member.full_name} vous a ete affecte. "
                    "Son dossier est disponible dans Mes clients."
                ),
                deduplication_key=deduplication_key,
            )
        )

    def coaching_booking_status(
        self,
        member: User,
        *,
        booking_id: uuid.UUID,
        booking_status: CoachingBookingStatus,
        coach_name: str,
        starts_at: datetime,
    ) -> Notification:
        messages = {
            CoachingBookingStatus.CONFIRMED: (
                "Seance coaching confirmee",
                f"Votre seance avec {coach_name} le {starts_at.isoformat()} est confirmee.",
            ),
            CoachingBookingStatus.CANCELLED: (
                "Seance coaching annulee",
                f"Votre seance avec {coach_name} le {starts_at.isoformat()} est annulee.",
            ),
            CoachingBookingStatus.COMPLETED: (
                "Seance coaching terminee",
                f"Votre seance avec {coach_name} a ete marquee comme terminee.",
            ),
        }
        if booking_status not in messages:
            raise ValueError("Statut coaching sans notification.")
        title, body = messages[booking_status]
        deduplication_key = f"coaching_booking_status:{booking_id}:{booking_status.value}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="coaching_booking_update",
                title=title,
                body=body,
                deduplication_key=deduplication_key,
            )
        )

    def coaching_booking_rescheduled(
        self,
        member: User,
        *,
        booking_id: uuid.UUID,
        coach_name: str,
        starts_at: datetime,
    ) -> Notification:
        deduplication_key = f"coaching_booking_rescheduled:{booking_id}:{starts_at.isoformat()}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=member.id,
                kind="coaching_booking_rescheduled",
                title="Horaire de seance modifie",
                body=(f"Votre seance avec {coach_name} a ete deplacee au {starts_at.isoformat()}."),
                deduplication_key=deduplication_key,
            )
        )

    def coaching_message_received(
        self,
        recipient: User,
        *,
        message_id: uuid.UUID,
        sender: User,
    ) -> Notification:
        deduplication_key = f"coaching_message_received:{message_id}:{recipient.id}"
        existing = self.repository.by_deduplication_key(deduplication_key)
        if existing:
            return existing
        return self.repository.add(
            Notification(
                user_id=recipient.id,
                kind="coaching_message_received",
                title="Nouveau message coaching",
                body=(
                    f"{sender.full_name} vous a envoye un message. "
                    "Ouvrez votre espace Coaching pour consulter la conversation."
                ),
                deduplication_key=deduplication_key,
            )
        )
