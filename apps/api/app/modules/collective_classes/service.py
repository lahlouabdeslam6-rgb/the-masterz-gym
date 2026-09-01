import uuid
from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.clubs.repository import ClubRepository
from app.modules.clubs.service import ClubService
from app.modules.collective_classes.models import (
    CollectiveClassReservation,
    CollectiveClassSession,
    CollectiveClassType,
)
from app.modules.collective_classes.repository import CollectiveClassRepository
from app.modules.collective_classes.schemas import (
    CollectiveClassReservationCancel,
    CollectiveClassReservationRead,
    CollectiveClassReservationStatusUpdate,
    CollectiveClassSessionCreate,
    CollectiveClassSessionRead,
    CollectiveClassSessionUpdate,
    CollectiveClassTypeCreate,
    CollectiveClassTypeUpdate,
)
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User
from app.shared.enums import (
    AccountStatus,
    CollectiveClassReservationStatus,
    CollectiveClassSessionStatus,
    UserRole,
)


class CollectiveClassService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = CollectiveClassRepository(session)
        self.clubs = ClubService(session)
        self.club_repository = ClubRepository(session)
        self.notifications = NotificationService(session)
        self.audit = AuditService(session)

    def list_class_types(
        self, club_id: uuid.UUID, actor: User, *, active_only: bool = True
    ) -> list[CollectiveClassType]:
        self.clubs.require_access(actor, club_id)
        return self.repository.list_class_types(club_id, active_only=active_only)

    def create_class_type(
        self, data: CollectiveClassTypeCreate, actor: User
    ) -> CollectiveClassType:
        self.clubs.require_access(actor, data.club_id)
        class_type = self.repository.add_class_type(CollectiveClassType(**data.model_dump()))
        self.audit.record(
            actor=actor,
            action="collective_class_type.created",
            entity_type="collective_class_type",
            entity_id=class_type.id,
            new_value={
                "club_id": str(class_type.club_id),
                "name": class_type.name,
                "capacity": class_type.default_capacity,
            },
        )
        return class_type

    def update_class_type(
        self,
        class_type_id: uuid.UUID,
        data: CollectiveClassTypeUpdate,
        actor: User,
    ) -> CollectiveClassType:
        class_type = self.repository.get_class_type(class_type_id)
        if not class_type:
            raise api_error(404, "collective_class_type_not_found", "Cours introuvable.")
        self.clubs.require_access(actor, class_type.club_id)
        previous = {
            "name": class_type.name,
            "duration": class_type.default_duration_minutes,
            "capacity": class_type.default_capacity,
            "is_active": class_type.is_active,
        }
        for field, value in data.model_dump(exclude={"reason"}, exclude_unset=True).items():
            setattr(class_type, field, value)
        self.repository.save_class_type(class_type)
        self.audit.record(
            actor=actor,
            action="collective_class_type.updated",
            entity_type="collective_class_type",
            entity_id=class_type.id,
            previous_value=previous,
            new_value={
                "name": class_type.name,
                "duration": class_type.default_duration_minutes,
                "capacity": class_type.default_capacity,
                "is_active": class_type.is_active,
            },
            reason=data.reason,
        )
        return class_type

    def create_session(
        self, data: CollectiveClassSessionCreate, actor: User
    ) -> CollectiveClassSessionRead:
        self.clubs.require_access(actor, data.club_id)
        class_type = self.repository.get_class_type(data.class_type_id)
        if not class_type or class_type.club_id != data.club_id or not class_type.is_active:
            raise api_error(422, "invalid_collective_class_type", "Ce cours est indisponible.")
        coach_id = actor.id if actor.role == UserRole.COACH else data.coach_id
        if not coach_id:
            raise api_error(422, "coach_required", "Selectionnez le coach du cours.")
        coach = self.repository.get_user(coach_id)
        if not coach or coach.role != UserRole.COACH or coach.status != AccountStatus.ACTIVE:
            raise api_error(422, "invalid_coach", "Coach indisponible.")
        if actor.role == UserRole.COACH and data.coach_id not in {None, actor.id}:
            raise api_error(403, "permission_denied", "Un coach ne peut publier que ses cours.")
        if all(club.id != data.club_id for club in self.club_repository.list_for_user(coach.id)):
            raise api_error(422, "coach_club_mismatch", "Ce coach n'est pas affecte a cette salle.")
        starts_at = data.starts_at.astimezone(UTC)
        if starts_at <= datetime.now(UTC):
            raise api_error(
                422, "session_must_be_future", "Le cours doit etre programme dans le futur."
            )
        duration = data.duration_minutes or class_type.default_duration_minutes
        capacity = data.capacity or class_type.default_capacity
        class_session = self.repository.add_session(
            CollectiveClassSession(
                club_id=data.club_id,
                class_type_id=class_type.id,
                coach_id=coach.id,
                starts_at=starts_at,
                ends_at=starts_at + timedelta(minutes=duration),
                capacity=capacity,
                note=data.note,
                status=CollectiveClassSessionStatus.SCHEDULED,
            )
        )
        self.audit.record(
            actor=actor,
            action="collective_class_session.created",
            entity_type="collective_class_session",
            entity_id=class_session.id,
            new_value={
                "club_id": str(class_session.club_id),
                "class_type_id": str(class_session.class_type_id),
                "coach_id": str(class_session.coach_id),
                "starts_at": class_session.starts_at.isoformat(),
                "capacity": class_session.capacity,
            },
        )
        return self._session_read(class_session, actor)

    def list_sessions(
        self,
        club_id: uuid.UUID,
        actor: User,
        *,
        coach_id: uuid.UUID | None = None,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
        include_history: bool = False,
    ) -> list[CollectiveClassSessionRead]:
        self.clubs.require_access(actor, club_id)
        self._complete_past_sessions(club_id)
        sessions = self.repository.list_sessions(
            club_id,
            coach_id=coach_id,
            from_at=from_at,
            to_at=to_at,
            include_history=include_history,
        )
        return [self._session_read(item, actor) for item in sessions]

    def update_session(
        self,
        session_id: uuid.UUID,
        data: CollectiveClassSessionUpdate,
        actor: User,
    ) -> CollectiveClassSessionRead:
        class_session = self.repository.get_session(session_id, for_update=True)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        self.clubs.require_access(actor, class_session.club_id)
        self._require_session_manager(class_session, actor)
        confirmed_count, _ = self.repository.reservation_counts(class_session.id)
        if data.capacity is not None and data.capacity < confirmed_count:
            raise api_error(
                409,
                "capacity_below_confirmed_count",
                "La capacite ne peut pas etre inferieure aux places deja confirmees.",
            )
        previous = {
            "starts_at": class_session.starts_at.isoformat(),
            "ends_at": class_session.ends_at.isoformat(),
            "capacity": class_session.capacity,
            "status": class_session.status.value,
        }
        old_duration = class_session.ends_at - class_session.starts_at
        if data.starts_at:
            starts_at = data.starts_at.astimezone(UTC)
            if starts_at <= datetime.now(UTC):
                raise api_error(
                    422,
                    "session_must_be_future",
                    "Le cours doit etre programme dans le futur.",
                )
            class_session.starts_at = starts_at
            class_session.ends_at = class_session.starts_at + old_duration
        if data.duration_minutes:
            class_session.ends_at = class_session.starts_at + timedelta(
                minutes=data.duration_minutes
            )
        capacity_increased = data.capacity is not None and data.capacity > class_session.capacity
        if data.capacity is not None:
            class_session.capacity = data.capacity
        if "note" in data.model_fields_set:
            class_session.note = data.note
        if data.status:
            class_session.status = data.status
        self.repository.save_session(class_session)
        if data.status == CollectiveClassSessionStatus.CANCELLED:
            self._cancel_all_reservations(class_session, actor, data.reason)
        elif capacity_increased:
            class_type = self._class_type(class_session.class_type_id)
            confirmed_count, _ = self.repository.reservation_counts(class_session.id)
            while confirmed_count < class_session.capacity:
                promoted = self._promote_waitlisted(class_session, class_type.name)
                if not promoted:
                    break
                confirmed_count += 1
        self.audit.record(
            actor=actor,
            action="collective_class_session.updated",
            entity_type="collective_class_session",
            entity_id=class_session.id,
            previous_value=previous,
            new_value={
                "starts_at": class_session.starts_at.isoformat(),
                "ends_at": class_session.ends_at.isoformat(),
                "capacity": class_session.capacity,
                "status": class_session.status.value,
            },
            reason=data.reason,
        )
        return self._session_read(class_session, actor)

    def reserve(self, session_id: uuid.UUID, actor: User) -> CollectiveClassReservationRead:
        class_session = self.repository.get_session(session_id, for_update=True)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        self.clubs.require_access(actor, class_session.club_id)
        if class_session.status != CollectiveClassSessionStatus.SCHEDULED:
            raise api_error(409, "session_not_open", "Cette seance n'accepte plus de reservations.")
        if class_session.starts_at <= datetime.now(UTC):
            raise api_error(409, "session_started", "Cette seance a deja commence.")
        if not self.repository.active_gym_subscription(
            actor.id, class_session.club_id, class_session.starts_at.date()
        ):
            raise api_error(
                403,
                "club_subscription_required",
                "Un abonnement actif dans cette salle est requis pour reserver ce cours.",
            )
        existing = self.repository.reservation_for_member(class_session.id, actor.id)
        if existing and existing.status != CollectiveClassReservationStatus.CANCELLED:
            raise api_error(409, "reservation_exists", "Vous avez deja reserve cette seance.")
        confirmed_count, _ = self.repository.reservation_counts(class_session.id)
        if confirmed_count < class_session.capacity:
            reservation_status = CollectiveClassReservationStatus.CONFIRMED
            waitlist_position = None
        else:
            reservation_status = CollectiveClassReservationStatus.WAITLISTED
            waitlist_position = self.repository.next_waitlist_position(class_session.id)
        if existing:
            reservation = existing
            reservation.status = reservation_status
            reservation.waitlist_position = waitlist_position
            reservation.cancelled_by_id = None
            reservation.cancellation_reason = None
            self.repository.save_reservation(reservation)
        else:
            reservation = self.repository.add_reservation(
                CollectiveClassReservation(
                    session_id=class_session.id,
                    member_id=actor.id,
                    status=reservation_status,
                    waitlist_position=waitlist_position,
                )
            )
        class_type = self._class_type(class_session.class_type_id)
        coach = self._user(class_session.coach_id)
        self.notifications.collective_class_reservation_update(
            actor,
            reservation_id=reservation.id,
            reservation_status=reservation.status,
            class_name=class_type.name,
            starts_at=class_session.starts_at,
            waitlist_position=reservation.waitlist_position,
        )
        self.notifications.collective_class_new_reservation(
            coach,
            reservation_id=reservation.id,
            member=actor,
            class_name=class_type.name,
            starts_at=class_session.starts_at,
            reservation_status=reservation.status,
        )
        self.audit.record(
            actor=actor,
            action="collective_class.reserved",
            entity_type="collective_class_reservation",
            entity_id=reservation.id,
            new_value={
                "session_id": str(class_session.id),
                "status": reservation.status.value,
                "waitlist_position": reservation.waitlist_position,
            },
        )
        return self._reservation_read(reservation)

    def cancel_reservation(
        self,
        reservation_id: uuid.UUID,
        data: CollectiveClassReservationCancel,
        actor: User,
    ) -> CollectiveClassReservationRead:
        reservation = self.repository.get_reservation(reservation_id, for_update=True)
        if not reservation:
            raise api_error(
                404, "collective_class_reservation_not_found", "Reservation introuvable."
            )
        class_session = self.repository.get_session(reservation.session_id, for_update=True)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        self.clubs.require_access(actor, class_session.club_id)
        if actor.role == UserRole.MEMBER and reservation.member_id != actor.id:
            raise api_error(403, "permission_denied", "Acces interdit.")
        if actor.role == UserRole.COACH and class_session.coach_id != actor.id:
            raise api_error(403, "permission_denied", "Acces interdit.")
        if reservation.status == CollectiveClassReservationStatus.CANCELLED:
            return self._reservation_read(reservation)
        if reservation.status in {
            CollectiveClassReservationStatus.ATTENDED,
            CollectiveClassReservationStatus.NO_SHOW,
        }:
            raise api_error(409, "reservation_closed", "Cette reservation est deja terminee.")
        was_confirmed = reservation.status == CollectiveClassReservationStatus.CONFIRMED
        reservation.status = CollectiveClassReservationStatus.CANCELLED
        reservation.waitlist_position = None
        reservation.cancelled_by_id = actor.id
        reservation.cancellation_reason = data.reason
        self.repository.save_reservation(reservation)
        member = self._user(reservation.member_id)
        class_type = self._class_type(class_session.class_type_id)
        self.notifications.collective_class_reservation_update(
            member,
            reservation_id=reservation.id,
            reservation_status=reservation.status,
            class_name=class_type.name,
            starts_at=class_session.starts_at,
        )
        if was_confirmed:
            self._promote_waitlisted(class_session, class_type.name)
        self.audit.record(
            actor=actor,
            action="collective_class.reservation_cancelled",
            entity_type="collective_class_reservation",
            entity_id=reservation.id,
            new_value={"status": reservation.status.value},
            reason=data.reason,
        )
        return self._reservation_read(reservation)

    def update_reservation_status(
        self,
        reservation_id: uuid.UUID,
        data: CollectiveClassReservationStatusUpdate,
        actor: User,
    ) -> CollectiveClassReservationRead:
        if data.status not in {
            CollectiveClassReservationStatus.ATTENDED,
            CollectiveClassReservationStatus.NO_SHOW,
        }:
            raise api_error(422, "invalid_status", "Utilisez uniquement Present ou Absence.")
        reservation = self.repository.get_reservation(reservation_id, for_update=True)
        if not reservation:
            raise api_error(
                404, "collective_class_reservation_not_found", "Reservation introuvable."
            )
        class_session = self.repository.get_session(reservation.session_id)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        self.clubs.require_access(actor, class_session.club_id)
        self._require_session_manager(class_session, actor)
        if reservation.status != CollectiveClassReservationStatus.CONFIRMED:
            raise api_error(409, "reservation_not_confirmed", "La place n'est pas confirmee.")
        reservation.status = data.status
        self.repository.save_reservation(reservation)
        self.audit.record(
            actor=actor,
            action="collective_class.attendance_updated",
            entity_type="collective_class_reservation",
            entity_id=reservation.id,
            new_value={"status": reservation.status.value},
            reason=data.reason,
        )
        return self._reservation_read(reservation)

    def list_session_reservations(
        self, session_id: uuid.UUID, actor: User
    ) -> list[CollectiveClassReservationRead]:
        class_session = self.repository.get_session(session_id)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        self.clubs.require_access(actor, class_session.club_id)
        self._require_session_manager(class_session, actor)
        return [
            self._reservation_read(item)
            for item in self.repository.reservations_for_session(session_id)
        ]

    def list_my_reservations(
        self, actor: User, *, limit: int = 200
    ) -> list[CollectiveClassReservationRead]:
        return [
            self._reservation_read(item)
            for item in self.repository.list_member_reservations(actor.id, limit=limit)
        ]

    def _complete_past_sessions(self, club_id: uuid.UUID) -> None:
        now = datetime.now(UTC)
        sessions = self.repository.list_sessions(club_id, include_history=False)
        for class_session in sessions:
            if class_session.ends_at <= now:
                class_session.status = CollectiveClassSessionStatus.COMPLETED
                self.repository.save_session(class_session)

    def _promote_waitlisted(self, class_session: CollectiveClassSession, class_name: str) -> bool:
        promoted = self.repository.next_waitlisted(class_session.id)
        if not promoted:
            return False
        promoted.status = CollectiveClassReservationStatus.CONFIRMED
        promoted.waitlist_position = None
        self.repository.save_reservation(promoted)
        position = 1
        for item in self.repository.reservations_for_session(class_session.id):
            if item.status == CollectiveClassReservationStatus.WAITLISTED:
                item.waitlist_position = position
                position += 1
                self.repository.save_reservation(item)
        member = self._user(promoted.member_id)
        self.notifications.collective_class_reservation_update(
            member,
            reservation_id=promoted.id,
            reservation_status=promoted.status,
            class_name=class_name,
            starts_at=class_session.starts_at,
            promoted=True,
        )
        return True

    def _cancel_all_reservations(
        self, class_session: CollectiveClassSession, actor: User, reason: str
    ) -> None:
        class_type = self._class_type(class_session.class_type_id)
        for reservation in self.repository.reservations_for_session(class_session.id):
            if reservation.status in {
                CollectiveClassReservationStatus.CANCELLED,
                CollectiveClassReservationStatus.ATTENDED,
                CollectiveClassReservationStatus.NO_SHOW,
            }:
                continue
            reservation.status = CollectiveClassReservationStatus.CANCELLED
            reservation.waitlist_position = None
            reservation.cancelled_by_id = actor.id
            reservation.cancellation_reason = reason
            self.repository.save_reservation(reservation)
            self.notifications.collective_class_reservation_update(
                self._user(reservation.member_id),
                reservation_id=reservation.id,
                reservation_status=reservation.status,
                class_name=class_type.name,
                starts_at=class_session.starts_at,
            )

    def _require_session_manager(self, class_session: CollectiveClassSession, actor: User) -> None:
        if actor.role in {UserRole.ADMIN, UserRole.RECEPTIONIST}:
            return
        if actor.role == UserRole.COACH and class_session.coach_id == actor.id:
            return
        raise api_error(status.HTTP_403_FORBIDDEN, "permission_denied", "Acces interdit.")

    def _session_read(
        self, class_session: CollectiveClassSession, actor: User
    ) -> CollectiveClassSessionRead:
        class_type = self._class_type(class_session.class_type_id)
        coach = self._user(class_session.coach_id)
        confirmed_count, waitlist_count = self.repository.reservation_counts(class_session.id)
        own = (
            self.repository.reservation_for_member(class_session.id, actor.id)
            if actor.role == UserRole.MEMBER
            else None
        )
        return CollectiveClassSessionRead(
            id=class_session.id,
            club_id=class_session.club_id,
            class_type_id=class_session.class_type_id,
            class_name=class_type.name,
            coach_id=class_session.coach_id,
            coach_name=coach.full_name,
            starts_at=class_session.starts_at,
            ends_at=class_session.ends_at,
            capacity=class_session.capacity,
            confirmed_count=confirmed_count,
            waitlist_count=waitlist_count,
            available_spots=max(class_session.capacity - confirmed_count, 0),
            note=class_session.note,
            status=class_session.status,
            my_reservation_id=own.id if own else None,
            my_reservation_status=own.status if own else None,
            created_at=class_session.created_at,
        )

    def _reservation_read(
        self, reservation: CollectiveClassReservation
    ) -> CollectiveClassReservationRead:
        class_session = self.repository.get_session(reservation.session_id)
        if not class_session:
            raise api_error(404, "collective_class_session_not_found", "Seance introuvable.")
        member = self._user(reservation.member_id)
        coach = self._user(class_session.coach_id)
        class_type = self._class_type(class_session.class_type_id)
        return CollectiveClassReservationRead(
            id=reservation.id,
            session_id=reservation.session_id,
            member_id=reservation.member_id,
            member_name=member.full_name,
            member_number=member.member_number,
            class_name=class_type.name,
            coach_name=coach.full_name,
            starts_at=class_session.starts_at,
            ends_at=class_session.ends_at,
            status=reservation.status,
            waitlist_position=reservation.waitlist_position,
            cancellation_reason=reservation.cancellation_reason,
            created_at=reservation.created_at,
            updated_at=reservation.updated_at,
        )

    def _user(self, user_id: uuid.UUID) -> User:
        user = self.repository.get_user(user_id)
        if not user:
            raise api_error(404, "user_not_found", "Utilisateur introuvable.")
        return user

    def _class_type(self, class_type_id: uuid.UUID) -> CollectiveClassType:
        class_type = self.repository.get_class_type(class_type_id)
        if not class_type:
            raise api_error(404, "collective_class_type_not_found", "Cours introuvable.")
        return class_type
