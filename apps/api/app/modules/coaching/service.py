import uuid
from datetime import UTC, datetime, timedelta

from fastapi import UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.coaching.media import CoachingMediaService
from app.modules.coaching.models import (
    CoachAvailability,
    CoachingAssessment,
    CoachingAssignmentRequest,
    CoachingBooking,
    CoachingClientProfile,
    CoachingMessage,
    CoachMemberAssignment,
)
from app.modules.coaching.repository import CoachingRepository
from app.modules.coaching.schemas import (
    CoachAvailabilityCreate,
    CoachAvailabilityRead,
    CoachAvailabilityUpdate,
    CoachDirectoryRead,
    CoachingAssessmentCreate,
    CoachingAssessmentRead,
    CoachingAssignmentRequestCreate,
    CoachingAssignmentRequestDecision,
    CoachingAssignmentRequestRead,
    CoachingBookingCreate,
    CoachingBookingRead,
    CoachingBookingReschedule,
    CoachingBookingStatusUpdate,
    CoachingConversationRead,
    CoachingMessageRead,
    CoachingObjectiveRead,
    CoachingObjectiveUpdate,
    CoachingTrackingRead,
    CoachMemberAssignmentCreate,
    CoachMemberAssignmentEnd,
    CoachMemberAssignmentRead,
    CoachSummary,
)
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.service import MembershipService
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import (
    AccountStatus,
    CoachingAssignmentRequestStatus,
    CoachingBookingStatus,
    ServiceType,
    SubscriptionStatus,
    UserRole,
)
from app.shared.time import local_today


class CoachingService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.coaching = CoachingRepository(session)
        self.users = UserRepository(session)
        self.memberships = MembershipRepository(session)
        self.membership_service = MembershipService(session)
        self.notifications = NotificationService(session)
        self.audit = AuditService(session)

    def list_coach_directory(self, actor: User) -> list[CoachDirectoryRead]:
        if actor.role == UserRole.MEMBER:
            self._require_active_coaching_subscription(actor.id)
        return [
            CoachDirectoryRead(
                id=coach.id,
                full_name=coach.full_name,
                status=coach.status,
                active_member_count=self.coaching.active_member_count(coach.id),
            )
            for coach in self.coaching.list_coaches()
            if coach.status == AccountStatus.ACTIVE
        ]

    def get_my_assignment(self, actor: User) -> CoachMemberAssignmentRead | None:
        assignment = self.coaching.active_assignment_for_member(actor.id)
        return self._assignment_read(assignment) if assignment else None

    def list_assignment_requests(
        self,
        actor: User,
        *,
        request_status: CoachingAssignmentRequestStatus | None,
        limit: int,
    ) -> list[CoachingAssignmentRequestRead]:
        member_id = actor.id if actor.role == UserRole.MEMBER else None
        return [
            self._assignment_request_read(item)
            for item in self.coaching.list_assignment_requests(
                member_id=member_id,
                request_status=request_status,
                limit=limit,
            )
        ]

    def create_assignment_request(
        self,
        data: CoachingAssignmentRequestCreate,
        actor: User,
    ) -> CoachingAssignmentRequestRead:
        self._require_active_coaching_subscription(actor.id)
        if self.coaching.active_assignment_for_member(actor.id):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_already_has_coach",
                "Un coach est deja affecte a votre compte.",
            )
        if self.coaching.pending_assignment_request_for_member(actor.id):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coaching_assignment_request_pending",
                "Une demande de coach est deja en attente.",
            )
        preferred_coach = None
        if data.preferred_coach_id:
            preferred_coach = self.users.get(data.preferred_coach_id)
            if not preferred_coach or preferred_coach.role != UserRole.COACH:
                raise api_error(
                    status.HTTP_404_NOT_FOUND,
                    "coach_not_found",
                    "Coach introuvable.",
                )
            if preferred_coach.status != AccountStatus.ACTIVE:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "coach_inactive",
                    "Ce coach ne peut pas recevoir de nouveaux clients.",
                )

        request = CoachingAssignmentRequest(
            member_id=actor.id,
            preferred_coach_id=preferred_coach.id if preferred_coach else None,
            assigned_coach_id=None,
            status=CoachingAssignmentRequestStatus.PENDING,
            member_note=self._clean_note(data.member_note),
            decision_note=None,
            decided_by_id=None,
            decided_at=None,
        )
        try:
            with self.session.begin_nested():
                self.coaching.add_assignment_request(request)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coaching_assignment_request_pending",
                "Une demande de coach est deja en attente.",
            ) from exc
        self.audit.record(
            actor=actor,
            action="coaching.assignment_requested",
            entity_type="coaching_assignment_request",
            entity_id=request.id,
            previous_value=None,
            new_value={
                "member_id": str(actor.id),
                "preferred_coach_id": (str(preferred_coach.id) if preferred_coach else None),
            },
            reason=request.member_note or "Demande d'affectation a un coach",
        )
        return self._assignment_request_read(
            request,
            member=actor,
            preferred_coach=preferred_coach,
        )

    def decide_assignment_request(
        self,
        request_id: uuid.UUID,
        data: CoachingAssignmentRequestDecision,
        actor: User,
    ) -> CoachingAssignmentRequestRead:
        with self.session.begin_nested():
            request = self.coaching.get_assignment_request(request_id, for_update=True)
            if not request:
                raise api_error(
                    status.HTTP_404_NOT_FOUND,
                    "coaching_assignment_request_not_found",
                    "Demande de coach introuvable.",
                )
            if request.status != CoachingAssignmentRequestStatus.PENDING:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "coaching_assignment_request_already_decided",
                    "Cette demande a deja ete traitee.",
                )
            member = self.users.get(request.member_id)
            if not member or member.role != UserRole.MEMBER:
                raise RuntimeError("Membre de demande coaching incoherent.")

            assigned_coach = None
            if data.status == CoachingAssignmentRequestStatus.APPROVED:
                if self.coaching.active_assignment_for_member(member.id, for_update=True):
                    raise api_error(
                        status.HTTP_409_CONFLICT,
                        "member_already_has_coach",
                        "Un coach est deja affecte a ce membre.",
                    )
                coach_id = data.coach_id or request.preferred_coach_id
                if not coach_id:
                    raise api_error(
                        status.HTTP_422_UNPROCESSABLE_CONTENT,
                        "coach_required",
                        "Choisissez un coach avant de valider la demande.",
                    )
                assignment = self.assign_member(
                    CoachMemberAssignmentCreate(
                        coach_id=coach_id,
                        member_id=member.id,
                        reason=(
                            self._clean_note(data.decision_note) or "Demande du membre validee"
                        ),
                    ),
                    actor,
                )
                assigned_coach = self.users.get(assignment.coach_id)
                if not assigned_coach:
                    raise RuntimeError("Coach affecte incoherent.")
                request.assigned_coach_id = assigned_coach.id

            request.status = data.status
            request.decision_note = self._clean_note(data.decision_note)
            request.decided_by_id = actor.id
            request.decided_at = datetime.now(UTC)
            self.coaching.save_assignment_request(request)

            self.notifications.coaching_assignment_request_decision(
                member,
                request_id=request.id,
                request_status=request.status,
                coach_name=assigned_coach.full_name if assigned_coach else None,
            )
            if assigned_coach:
                self.notifications.coaching_member_assigned(
                    assigned_coach,
                    request_id=request.id,
                    member=member,
                )
            self.audit.record(
                actor=actor,
                action="coaching.assignment_request_decided",
                entity_type="coaching_assignment_request",
                entity_id=request.id,
                previous_value={"status": CoachingAssignmentRequestStatus.PENDING.value},
                new_value={
                    "status": request.status.value,
                    "assigned_coach_id": (
                        str(request.assigned_coach_id) if request.assigned_coach_id else None
                    ),
                },
                reason=request.decision_note or "Validation de la demande de coach",
            )

        return self._assignment_request_read(
            request,
            member=member,
            assigned_coach=assigned_coach,
            decided_by=actor,
        )

    def list_availability(
        self,
        actor: User,
        *,
        coach_id: uuid.UUID | None,
        from_at: datetime | None,
        to_at: datetime | None,
        active_only: bool,
    ) -> list[CoachAvailabilityRead]:
        from_at = self._aware_or_none(from_at, "from_at")
        to_at = self._aware_or_none(to_at, "to_at")
        if from_at and to_at and to_at <= from_at:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "invalid_schedule_period",
                "La fin de la periode doit etre posterieure au debut.",
            )
        if actor.role == UserRole.COACH:
            coach_id = actor.id
        elif actor.role == UserRole.MEMBER:
            assignment = self.coaching.active_assignment_for_member(actor.id)
            if not assignment:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "active_coach_assignment_required",
                    "Aucun coach actif n'est affecte a votre compte.",
                )
            self._require_active_coaching_subscription(actor.id)
            coach_id = assignment.coach_id
            active_only = True
            from_at = max(from_at or datetime.now(UTC), datetime.now(UTC))
        return [
            self._availability_read(item)
            for item in self.coaching.list_availabilities(
                coach_id=coach_id,
                from_at=from_at,
                to_at=to_at,
                active_only=active_only,
            )
        ]

    def create_availability(
        self,
        data: CoachAvailabilityCreate,
        actor: User,
    ) -> CoachAvailabilityRead:
        starts_at = data.starts_at.astimezone(UTC)
        ends_at = data.ends_at.astimezone(UTC)
        if starts_at <= datetime.now(UTC):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "availability_must_be_future",
                "La disponibilite doit commencer dans le futur.",
            )
        availability = self.coaching.add_availability(
            CoachAvailability(
                coach_id=actor.id,
                starts_at=starts_at,
                ends_at=ends_at,
                session_duration_minutes=data.session_duration_minutes,
                note=self._clean_note(data.note),
                is_active=True,
            )
        )
        self.audit.record(
            actor=actor,
            action="coaching.availability_created",
            entity_type="coach_availability",
            entity_id=availability.id,
            previous_value=None,
            new_value={
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "session_duration_minutes": data.session_duration_minutes,
            },
            reason="Ajout d'une disponibilite coaching",
        )
        return self._availability_read(availability, coach=actor)

    def update_availability(
        self,
        availability_id: uuid.UUID,
        data: CoachAvailabilityUpdate,
        actor: User,
    ) -> CoachAvailabilityRead:
        availability = self.coaching.get_availability(availability_id)
        if not availability or availability.coach_id != actor.id:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "availability_not_found",
                "Disponibilite introuvable.",
            )
        starts_at = data.starts_at.astimezone(UTC)
        ends_at = data.ends_at.astimezone(UTC)
        schedule_changed = (
            starts_at != availability.starts_at
            or ends_at != availability.ends_at
            or data.session_duration_minutes != availability.session_duration_minutes
        )
        open_booking_count = self.coaching.availability_booking_count(
            availability.id,
            statuses={
                CoachingBookingStatus.REQUESTED,
                CoachingBookingStatus.CONFIRMED,
            },
        )
        if open_booking_count and (schedule_changed or not data.is_active):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "availability_has_bookings",
                "Annulez ou deplacez les reservations avant de modifier ce creneau.",
                {"open_booking_count": open_booking_count},
            )
        if data.is_active and schedule_changed and starts_at <= datetime.now(UTC):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "availability_must_be_future",
                "La disponibilite doit commencer dans le futur.",
            )
        previous_value = {
            "starts_at": availability.starts_at.isoformat(),
            "ends_at": availability.ends_at.isoformat(),
            "is_active": availability.is_active,
            "session_duration_minutes": availability.session_duration_minutes,
        }
        availability.starts_at = starts_at
        availability.ends_at = ends_at
        availability.session_duration_minutes = data.session_duration_minutes
        availability.note = self._clean_note(data.note)
        availability.is_active = data.is_active
        self.coaching.save_availability(availability)
        self.audit.record(
            actor=actor,
            action="coaching.availability_updated",
            entity_type="coach_availability",
            entity_id=availability.id,
            previous_value=previous_value,
            new_value={
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "is_active": availability.is_active,
                "session_duration_minutes": availability.session_duration_minutes,
            },
            reason="Mise a jour d'une disponibilite coaching",
        )
        return self._availability_read(availability, coach=actor)

    def list_bookings(
        self,
        actor: User,
        *,
        coach_id: uuid.UUID | None,
        member_id: uuid.UUID | None,
        booking_status: CoachingBookingStatus | None,
        from_at: datetime | None,
        to_at: datetime | None,
        limit: int,
    ) -> list[CoachingBookingRead]:
        from_at = self._aware_or_none(from_at, "from_at")
        to_at = self._aware_or_none(to_at, "to_at")
        if actor.role == UserRole.COACH:
            coach_id = actor.id
            member_id = None
        elif actor.role == UserRole.MEMBER:
            member_id = actor.id
            coach_id = None
        return [
            self._booking_read(item)
            for item in self.coaching.list_bookings(
                coach_id=coach_id,
                member_id=member_id,
                booking_status=booking_status,
                from_at=from_at,
                to_at=to_at,
                limit=limit,
            )
        ]

    def create_booking(
        self,
        data: CoachingBookingCreate,
        actor: User,
    ) -> CoachingBookingRead:
        assignment = self.coaching.active_assignment_for_member(actor.id)
        if not assignment:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_coach_assignment_required",
                "Aucun coach actif n'est affecte a votre compte.",
            )
        self._require_active_coaching_subscription(actor.id)
        availability = self.coaching.get_availability(data.availability_id)
        if (
            not availability
            or not availability.is_active
            or availability.coach_id != assignment.coach_id
        ):
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "availability_not_found",
                "Ce creneau n'est plus disponible.",
            )
        starts_at, ends_at = self._booking_period(availability, data.starts_at)
        self.coaching.lock_coach_schedule(assignment.coach_id)
        member_conflicts = self.coaching.overlapping_bookings(
            member_id=actor.id,
            starts_at=starts_at,
            ends_at=ends_at,
            statuses={
                CoachingBookingStatus.REQUESTED,
                CoachingBookingStatus.CONFIRMED,
            },
        )
        if member_conflicts:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_booking_overlap",
                "Vous avez deja une reservation coaching pendant ce creneau.",
            )
        coach_conflicts = self.coaching.overlapping_bookings(
            coach_id=assignment.coach_id,
            starts_at=starts_at,
            ends_at=ends_at,
            statuses={
                CoachingBookingStatus.REQUESTED,
                CoachingBookingStatus.CONFIRMED,
            },
        )
        if coach_conflicts:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coaching_slot_unavailable",
                "Cette heure vient d'etre reservee. Choisissez une autre heure.",
            )
        booking = CoachingBooking(
            availability_id=availability.id,
            assignment_id=assignment.id,
            coach_id=assignment.coach_id,
            member_id=actor.id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=CoachingBookingStatus.REQUESTED,
            member_note=self._clean_note(data.member_note),
            decision_note=None,
            decided_by_id=None,
            decided_at=None,
            conflict_override=False,
        )
        try:
            self.coaching.add_booking(booking)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "booking_already_exists",
                "Vous avez deja reserve ce creneau.",
            ) from exc
        coach = self.users.get(assignment.coach_id)
        if not coach:
            raise RuntimeError("Coach de reservation incoherent.")
        self.notifications.coaching_booking_requested(
            coach,
            booking_id=booking.id,
            member=actor,
            starts_at=booking.starts_at,
        )
        self.audit.record(
            actor=actor,
            action="coaching.booking_requested",
            entity_type="coaching_booking",
            entity_id=booking.id,
            previous_value=None,
            new_value={
                "coach_id": str(booking.coach_id),
                "starts_at": booking.starts_at.isoformat(),
            },
            reason="Reservation d'une seance coaching",
        )
        return self._booking_read(booking, coach=coach, member=actor)

    def update_booking_status(
        self,
        booking_id: uuid.UUID,
        data: CoachingBookingStatusUpdate,
        actor: User,
    ) -> CoachingBookingRead:
        booking = self.coaching.get_booking(booking_id, for_update=True)
        if not booking:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "booking_not_found",
                "Reservation coaching introuvable.",
            )
        self._booking_write_permission(booking, actor, allow_member_cancel=True, target=data.status)
        if booking.status == data.status:
            return self._booking_read(booking)
        allowed_transitions = {
            CoachingBookingStatus.REQUESTED: {
                CoachingBookingStatus.CONFIRMED,
                CoachingBookingStatus.CANCELLED,
            },
            CoachingBookingStatus.CONFIRMED: {
                CoachingBookingStatus.CANCELLED,
                CoachingBookingStatus.COMPLETED,
            },
        }
        if data.status not in allowed_transitions.get(booking.status, set()):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "booking_status_transition_invalid",
                "Ce changement de statut n'est pas autorise.",
            )
        conflicts: list[CoachingBooking] = []
        if data.status == CoachingBookingStatus.CONFIRMED:
            self.coaching.lock_coach_schedule(booking.coach_id)
            conflicts = self.coaching.overlapping_bookings(
                coach_id=booking.coach_id,
                starts_at=booking.starts_at,
                ends_at=booking.ends_at,
                statuses={CoachingBookingStatus.CONFIRMED},
                exclude_booking_id=booking.id,
            )
            if conflicts and not data.confirm_overlap:
                self._raise_booking_overlap(conflicts)
        previous_status = booking.status
        booking.status = data.status
        booking.decision_note = self._clean_note(data.decision_note)
        booking.decided_by_id = actor.id
        booking.decided_at = datetime.now(UTC)
        booking.conflict_override = bool(conflicts and data.confirm_overlap)
        self.coaching.save_booking(booking)
        member = self.users.get(booking.member_id)
        coach = self.users.get(booking.coach_id)
        if not member or not coach:
            raise RuntimeError("Reservation coaching incoherente.")
        self.notifications.coaching_booking_status(
            member,
            booking_id=booking.id,
            booking_status=booking.status,
            coach_name=coach.full_name,
            starts_at=booking.starts_at,
        )
        self.audit.record(
            actor=actor,
            action="coaching.booking_status_updated",
            entity_type="coaching_booking",
            entity_id=booking.id,
            previous_value={"status": previous_status.value},
            new_value={
                "status": booking.status.value,
                "conflict_override": booking.conflict_override,
            },
            reason=booking.decision_note or "Mise a jour de la reservation coaching",
        )
        return self._booking_read(booking, coach=coach, member=member, decided_by=actor)

    def reschedule_booking(
        self,
        booking_id: uuid.UUID,
        data: CoachingBookingReschedule,
        actor: User,
    ) -> CoachingBookingRead:
        booking = self.coaching.get_booking(booking_id, for_update=True)
        if not booking:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "booking_not_found",
                "Reservation coaching introuvable.",
            )
        self._booking_write_permission(booking, actor)
        if booking.status not in {
            CoachingBookingStatus.REQUESTED,
            CoachingBookingStatus.CONFIRMED,
        }:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "booking_reschedule_forbidden",
                "Cette reservation ne peut plus etre deplacee.",
            )
        availability = self.coaching.get_availability(data.availability_id)
        if (
            not availability
            or not availability.is_active
            or availability.coach_id != booking.coach_id
        ):
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "availability_not_found",
                "Le nouveau creneau n'est plus disponible.",
            )
        starts_at, ends_at = self._booking_period(availability, data.starts_at)
        self.coaching.lock_coach_schedule(booking.coach_id)
        member_conflicts = self.coaching.overlapping_bookings(
            member_id=booking.member_id,
            starts_at=starts_at,
            ends_at=ends_at,
            statuses={
                CoachingBookingStatus.REQUESTED,
                CoachingBookingStatus.CONFIRMED,
            },
            exclude_booking_id=booking.id,
        )
        if member_conflicts:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_booking_overlap",
                "Le membre a deja une reservation pendant ce creneau.",
            )
        coach_conflicts = self.coaching.overlapping_bookings(
            coach_id=booking.coach_id,
            starts_at=starts_at,
            ends_at=ends_at,
            statuses={
                CoachingBookingStatus.REQUESTED,
                CoachingBookingStatus.CONFIRMED,
            },
            exclude_booking_id=booking.id,
        )
        if coach_conflicts:
            if booking.status == CoachingBookingStatus.REQUESTED:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "coaching_slot_unavailable",
                    "Cette heure est deja reservee.",
                )
            if not data.confirm_overlap:
                self._raise_booking_overlap(coach_conflicts)
        previous_value = {
            "availability_id": str(booking.availability_id),
            "starts_at": booking.starts_at.isoformat(),
            "ends_at": booking.ends_at.isoformat(),
        }
        booking.availability_id = availability.id
        booking.starts_at = starts_at
        booking.ends_at = ends_at
        booking.decision_note = self._clean_note(data.decision_note)
        booking.decided_by_id = actor.id
        booking.decided_at = datetime.now(UTC)
        booking.conflict_override = bool(coach_conflicts and data.confirm_overlap)
        self.coaching.save_booking(booking)
        member = self.users.get(booking.member_id)
        coach = self.users.get(booking.coach_id)
        if not member or not coach:
            raise RuntimeError("Reservation coaching incoherente.")
        self.notifications.coaching_booking_rescheduled(
            member,
            booking_id=booking.id,
            coach_name=coach.full_name,
            starts_at=booking.starts_at,
        )
        self.audit.record(
            actor=actor,
            action="coaching.booking_rescheduled",
            entity_type="coaching_booking",
            entity_id=booking.id,
            previous_value=previous_value,
            new_value={
                "availability_id": str(booking.availability_id),
                "starts_at": booking.starts_at.isoformat(),
                "ends_at": booking.ends_at.isoformat(),
                "conflict_override": booking.conflict_override,
            },
            reason=booking.decision_note or "Deplacement de la reservation coaching",
        )
        return self._booking_read(booking, coach=coach, member=member, decided_by=actor)

    def list_conversations(self, actor: User) -> list[CoachingConversationRead]:
        coach_id = actor.id if actor.role == UserRole.COACH else None
        member_id = actor.id if actor.role == UserRole.MEMBER else None
        assignments = self.coaching.list_assignments(
            active_only=True,
            coach_id=coach_id,
            member_id=member_id,
        )
        return [self._conversation_read(item) for item in assignments]

    def list_messages(
        self,
        assignment_id: uuid.UUID,
        actor: User,
        *,
        limit: int = 300,
    ) -> list[CoachingMessageRead]:
        assignment = self._message_assignment(assignment_id, actor, writing=False)
        return [
            self._message_read(message)
            for message in self.coaching.list_messages(assignment.id, limit=limit)
        ]

    async def create_message(
        self,
        assignment_id: uuid.UUID,
        actor: User,
        *,
        body: str | None,
        media: UploadFile | None,
    ) -> CoachingMessageRead:
        assignment = self._message_assignment(assignment_id, actor, writing=True)
        normalized_body = self._clean_note(body)
        if normalized_body and len(normalized_body) > 4000:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "coaching_message_too_long",
                "Le message ne doit pas depasser 4000 caracteres.",
            )
        media_url = None
        media_type = None
        media_path = None
        if media:
            media_url, media_type, media_path = await CoachingMediaService().save(media)
        if not normalized_body and not media_url:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "coaching_message_empty",
                "Ecrivez un message ou ajoutez une photo ou un audio.",
            )
        try:
            message = self.coaching.add_message(
                CoachingMessage(
                    assignment_id=assignment.id,
                    sender_id=actor.id,
                    body=normalized_body,
                    media_url=media_url,
                    media_type=media_type,
                )
            )
            self.audit.record(
                actor=actor,
                action="coaching.message_sent",
                entity_type="coaching_assignment",
                entity_id=assignment.id,
                new_value={"media_type": media_type, "has_text": bool(normalized_body)},
                reason="Message prive coaching",
            )
            recipient_id = (
                assignment.member_id if actor.id == assignment.coach_id else assignment.coach_id
            )
            recipient = self.users.get(recipient_id)
            if not recipient:
                raise RuntimeError("Destinataire du message coaching introuvable.")
            self.notifications.coaching_message_received(
                recipient,
                message_id=message.id,
                sender=actor,
            )
        except Exception:
            if media_path:
                media_path.unlink(missing_ok=True)
            raise
        return self._message_read(message, sender=actor)

    def list_coaches(self) -> list[CoachSummary]:
        return [
            CoachSummary(
                id=coach.id,
                full_name=coach.full_name,
                phone=coach.phone,
                email=coach.email,
                status=coach.status,
                active_member_count=self.coaching.active_member_count(coach.id),
            )
            for coach in self.coaching.list_coaches()
        ]

    def list_assignments(
        self,
        *,
        active_only: bool = True,
        coach_id: uuid.UUID | None = None,
        member_id: uuid.UUID | None = None,
    ) -> list[CoachMemberAssignmentRead]:
        return [
            self._assignment_read(item)
            for item in self.coaching.list_assignments(
                active_only=active_only,
                coach_id=coach_id,
                member_id=member_id,
            )
        ]

    def assign_member(
        self, data: CoachMemberAssignmentCreate, actor: User
    ) -> CoachMemberAssignmentRead:
        coach = self.users.get(data.coach_id)
        if not coach or coach.role != UserRole.COACH:
            raise api_error(status.HTTP_404_NOT_FOUND, "coach_not_found", "Coach introuvable.")
        if coach.status != AccountStatus.ACTIVE:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coach_inactive",
                "Ce coach ne peut pas recevoir de nouveaux clients.",
            )
        member = self.users.get(data.member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")

        now = datetime.now(UTC)
        previous = self.coaching.active_assignment_for_member(member.id, for_update=True)
        if previous and previous.coach_id == coach.id:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_already_assigned",
                "Ce membre est deja affecte a ce coach.",
            )

        today = local_today()
        coaching_subscription = self.memberships.current_subscription(
            member.id, today, ServiceType.COACHING
        )
        coaching_status = (
            self.membership_service.effective_status(coaching_subscription, today)
            if coaching_subscription
            else None
        )
        if (
            not coaching_subscription
            or coaching_subscription.starts_on > today
            or coaching_status not in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_coaching_subscription_required",
                "Un abonnement coaching actif est requis avant l'affectation.",
            )
        previous_value = None
        if previous:
            previous.ended_at = now
            previous_value = {
                "assignment_id": str(previous.id),
                "coach_id": str(previous.coach_id),
            }
            self.session.flush()

        assignment = CoachMemberAssignment(
            coach_id=coach.id,
            member_id=member.id,
            assigned_by_id=actor.id,
            started_at=now,
            ended_at=None,
            reason=data.reason,
        )
        try:
            self.coaching.add_assignment(assignment)
        except IntegrityError as exc:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "member_assignment_conflict",
                "L'affectation du membre a change. Rechargez la page.",
            ) from exc

        self.audit.record(
            actor=actor,
            action=("coaching.member_reassigned" if previous_value else "coaching.member_assigned"),
            entity_type="coach_member_assignment",
            entity_id=assignment.id,
            previous_value=previous_value,
            new_value={
                "coach_id": str(coach.id),
                "member_id": str(member.id),
            },
            reason=data.reason,
        )
        return self._assignment_read(assignment, coach=coach, member=member)

    def end_assignment(
        self,
        assignment_id: uuid.UUID,
        data: CoachMemberAssignmentEnd,
        actor: User,
    ) -> CoachMemberAssignmentRead:
        assignment = self.coaching.get_assignment(assignment_id)
        if not assignment:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "assignment_not_found",
                "Affectation introuvable.",
            )
        if assignment.ended_at:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "assignment_already_ended",
                "Cette affectation est deja terminee.",
            )
        assignment.ended_at = datetime.now(UTC)
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="coaching.assignment_ended",
            entity_type="coach_member_assignment",
            entity_id=assignment.id,
            previous_value={"ended_at": None},
            new_value={"ended_at": assignment.ended_at.isoformat()},
            reason=data.reason,
        )
        return self._assignment_read(assignment)

    def get_tracking(
        self, member_id: uuid.UUID, actor: User, *, limit: int = 100
    ) -> CoachingTrackingRead:
        member = self._member_for_tracking(member_id, actor)
        assignment = self.coaching.active_assignment_for_member(member.id)
        profile = self.coaching.get_profile(member.id)
        objective = None
        if profile:
            updated_by = self.users.get(profile.updated_by_id)
            if not updated_by:
                raise RuntimeError("Profil coaching incoherent.")
            objective = CoachingObjectiveRead(
                objective=profile.objective,
                updated_by_id=profile.updated_by_id,
                updated_by_name=updated_by.full_name,
                updated_at=profile.updated_at,
            )
        coach = self.users.get(assignment.coach_id) if assignment else None
        assessments = [
            self._assessment_read(item)
            for item in self.coaching.list_assessments(member.id, limit=limit)
        ]
        return CoachingTrackingRead(
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            coach_id=assignment.coach_id if assignment else None,
            coach_name=coach.full_name if coach else None,
            objective=objective,
            assessments=assessments,
        )

    def update_objective(
        self,
        member_id: uuid.UUID,
        data: CoachingObjectiveUpdate,
        actor: User,
    ) -> CoachingObjectiveRead:
        member, _ = self._coach_write_context(member_id, actor)
        profile = self.coaching.get_profile(member.id)
        had_objective = profile is not None
        if profile:
            profile.objective = data.objective.strip()
            profile.updated_by_id = actor.id
            self.session.flush()
        else:
            profile = self.coaching.add_profile(
                CoachingClientProfile(
                    member_id=member.id,
                    objective=data.objective.strip(),
                    updated_by_id=actor.id,
                )
            )
        self.audit.record(
            actor=actor,
            action=(
                "coaching.objective_updated" if had_objective else "coaching.objective_created"
            ),
            entity_type="coaching_client_profile",
            entity_id=profile.id,
            previous_value={"objective_defined": had_objective},
            new_value={"objective_defined": True, "member_id": str(member.id)},
            reason="Mise a jour de l'objectif coaching",
        )
        return CoachingObjectiveRead(
            objective=profile.objective,
            updated_by_id=profile.updated_by_id,
            updated_by_name=actor.full_name,
            updated_at=profile.updated_at,
        )

    def create_assessment(
        self,
        member_id: uuid.UUID,
        data: CoachingAssessmentCreate,
        actor: User,
    ) -> CoachingAssessmentRead:
        member, assignment = self._coach_write_context(member_id, actor)
        assessment = self.coaching.add_assessment(
            CoachingAssessment(
                assignment_id=assignment.id,
                member_id=member.id,
                coach_id=actor.id,
                test_type=data.test_type,
                measured_at=data.measured_at,
                metrics=dict(data.metrics),
                notes=data.notes.strip() if data.notes and data.notes.strip() else None,
            )
        )
        self.audit.record(
            actor=actor,
            action="coaching.assessment_recorded",
            entity_type="coaching_assessment",
            entity_id=assessment.id,
            previous_value=None,
            new_value={
                "member_id": str(member.id),
                "test_type": data.test_type.value,
            },
            reason="Nouveau test de progression coaching",
        )
        return self._assessment_read(assessment, coach=actor)

    def _member_for_tracking(self, member_id: uuid.UUID, actor: User) -> User:
        member = self.users.get(member_id)
        if not member or member.role != UserRole.MEMBER:
            raise api_error(status.HTTP_404_NOT_FOUND, "member_not_found", "Membre introuvable.")
        if actor.role == UserRole.ADMIN:
            return member
        if actor.role == UserRole.MEMBER and actor.id == member.id:
            return member
        if actor.role == UserRole.COACH and self.coaching.active_assignment_for_coach_member(
            actor.id, member.id
        ):
            return member
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "coaching_tracking_forbidden",
            "Vous ne pouvez pas consulter ce suivi coaching.",
        )

    def _coach_write_context(
        self, member_id: uuid.UUID, actor: User
    ) -> tuple[User, CoachMemberAssignment]:
        member = self._member_for_tracking(member_id, actor)
        if actor.role != UserRole.COACH:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "coach_write_required",
                "Seul le coach affecte peut alimenter ce suivi.",
            )
        assignment = self.coaching.active_assignment_for_coach_member(actor.id, member.id)
        if not assignment:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "active_coach_assignment_required",
                "Une affectation active a ce membre est requise.",
            )
        self._require_active_coaching_subscription(member.id)
        return member, assignment

    def _require_active_coaching_subscription(self, member_id: uuid.UUID) -> None:
        today = local_today()
        subscription = self.memberships.current_subscription(member_id, today, ServiceType.COACHING)
        effective_status = (
            self.membership_service.effective_status(subscription, today) if subscription else None
        )
        if (
            not subscription
            or subscription.starts_on > today
            or effective_status not in {SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRING_SOON}
        ):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "active_coaching_subscription_required",
                "Un abonnement coaching actif est requis.",
            )

    def _booking_write_permission(
        self,
        booking: CoachingBooking,
        actor: User,
        *,
        allow_member_cancel: bool = False,
        target: CoachingBookingStatus | None = None,
    ) -> None:
        if actor.role in {UserRole.ADMIN, UserRole.RECEPTIONIST}:
            return
        if actor.role == UserRole.COACH and booking.coach_id == actor.id:
            return
        if (
            allow_member_cancel
            and actor.role == UserRole.MEMBER
            and booking.member_id == actor.id
            and target == CoachingBookingStatus.CANCELLED
        ):
            return
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "booking_update_forbidden",
            "Vous ne pouvez pas modifier cette reservation coaching.",
        )

    def _raise_booking_overlap(self, conflicts: list[CoachingBooking]) -> None:
        details = []
        for conflict in conflicts:
            member = self.users.get(conflict.member_id)
            details.append(
                {
                    "booking_id": str(conflict.id),
                    "member_name": member.full_name if member else "Membre",
                    "starts_at": conflict.starts_at.isoformat(),
                    "ends_at": conflict.ends_at.isoformat(),
                }
            )
        raise api_error(
            status.HTTP_409_CONFLICT,
            "coaching_booking_overlap",
            "Ce coach a deja une seance confirmee au meme moment.",
            {"conflicts": details},
        )

    def _availability_read(
        self,
        availability: CoachAvailability,
        *,
        coach: User | None = None,
    ) -> CoachAvailabilityRead:
        coach = coach or self.users.get(availability.coach_id)
        if not coach:
            raise RuntimeError("Disponibilite coaching incoherente.")
        return CoachAvailabilityRead(
            id=availability.id,
            coach_id=availability.coach_id,
            coach_name=coach.full_name,
            starts_at=availability.starts_at,
            ends_at=availability.ends_at,
            session_duration_minutes=availability.session_duration_minutes,
            note=availability.note,
            is_active=availability.is_active,
            requested_booking_count=self.coaching.availability_booking_count(
                availability.id,
                statuses={CoachingBookingStatus.REQUESTED},
            ),
            confirmed_booking_count=self.coaching.availability_booking_count(
                availability.id,
                statuses={CoachingBookingStatus.CONFIRMED},
            ),
            created_at=availability.created_at,
            updated_at=availability.updated_at,
            reserved_periods=[
                {
                    "starts_at": booking.starts_at,
                    "ends_at": booking.ends_at,
                }
                for booking in self.coaching.availability_bookings(
                    availability.id,
                    statuses={
                        CoachingBookingStatus.REQUESTED,
                        CoachingBookingStatus.CONFIRMED,
                    },
                )
            ],
        )

    def _booking_period(
        self,
        availability: CoachAvailability,
        requested_start: datetime,
    ) -> tuple[datetime, datetime]:
        starts_at = requested_start.astimezone(UTC)
        duration = timedelta(minutes=availability.session_duration_minutes)
        ends_at = starts_at + duration
        offset = starts_at - availability.starts_at
        aligned = (
            offset.total_seconds() >= 0 and offset.total_seconds() % duration.total_seconds() == 0
        )
        if not aligned or starts_at < availability.starts_at or ends_at > availability.ends_at:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coaching_slot_outside_availability",
                "Choisissez une heure proposee dans la plage du coach.",
            )
        if starts_at <= datetime.now(UTC):
            raise api_error(
                status.HTTP_409_CONFLICT,
                "availability_already_started",
                "Cette heure a deja commence.",
            )
        return starts_at, ends_at

    def _message_assignment(
        self,
        assignment_id: uuid.UUID,
        actor: User,
        *,
        writing: bool,
    ) -> CoachMemberAssignment:
        assignment = self.coaching.get_assignment(assignment_id)
        if not assignment:
            raise api_error(
                status.HTTP_404_NOT_FOUND,
                "coaching_conversation_not_found",
                "Conversation coaching introuvable.",
            )
        allowed = (
            actor.role == UserRole.ADMIN
            or (actor.role == UserRole.COACH and assignment.coach_id == actor.id)
            or (actor.role == UserRole.MEMBER and assignment.member_id == actor.id)
        )
        if not allowed or (writing and actor.role == UserRole.ADMIN):
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "coaching_conversation_forbidden",
                "Vous n'avez pas acces a cette conversation.",
            )
        if writing and assignment.ended_at is not None:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "coaching_conversation_closed",
                "Cette conversation est fermee car le suivi coaching est termine.",
            )
        return assignment

    def _message_read(
        self,
        message: CoachingMessage,
        *,
        sender: User | None = None,
    ) -> CoachingMessageRead:
        sender = sender or self.users.get(message.sender_id)
        if not sender:
            raise RuntimeError("Auteur du message coaching introuvable.")
        return CoachingMessageRead(
            id=message.id,
            assignment_id=message.assignment_id,
            sender_id=message.sender_id,
            sender_name=sender.full_name,
            sender_role=sender.role.value,
            body=message.body,
            media_url=message.media_url,
            media_type=message.media_type,
            created_at=message.created_at,
        )

    def _conversation_read(
        self,
        assignment: CoachMemberAssignment,
    ) -> CoachingConversationRead:
        coach = self.users.get(assignment.coach_id)
        member = self.users.get(assignment.member_id)
        if not coach or not member:
            raise RuntimeError("Conversation coaching incoherente.")
        last = self.coaching.last_message(assignment.id)
        return CoachingConversationRead(
            assignment_id=assignment.id,
            coach_id=coach.id,
            coach_name=coach.full_name,
            member_id=member.id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            is_active=assignment.ended_at is None,
            last_message=self._message_read(last) if last else None,
        )

    def _booking_read(
        self,
        booking: CoachingBooking,
        *,
        coach: User | None = None,
        member: User | None = None,
        decided_by: User | None = None,
    ) -> CoachingBookingRead:
        coach = coach or self.users.get(booking.coach_id)
        member = member or self.users.get(booking.member_id)
        if booking.decided_by_id and not decided_by:
            decided_by = self.users.get(booking.decided_by_id)
        if not coach or not member:
            raise RuntimeError("Reservation coaching incoherente.")
        overlaps = self.coaching.overlapping_bookings(
            coach_id=booking.coach_id,
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            statuses={CoachingBookingStatus.CONFIRMED},
            exclude_booking_id=booking.id,
        )
        return CoachingBookingRead(
            id=booking.id,
            availability_id=booking.availability_id,
            assignment_id=booking.assignment_id,
            coach_id=booking.coach_id,
            coach_name=coach.full_name,
            member_id=booking.member_id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            status=booking.status,
            member_note=booking.member_note,
            decision_note=booking.decision_note,
            decided_by_id=booking.decided_by_id,
            decided_by_name=decided_by.full_name if decided_by else None,
            decided_at=booking.decided_at,
            conflict_override=booking.conflict_override,
            overlapping_confirmed_count=len(overlaps),
            created_at=booking.created_at,
            updated_at=booking.updated_at,
        )

    @staticmethod
    def _clean_note(value: str | None) -> str | None:
        normalized = value.strip() if value else ""
        return normalized or None

    @staticmethod
    def _aware_or_none(value: datetime | None, field_name: str) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "timezone_required",
                f"{field_name} doit inclure un fuseau horaire.",
            )
        return value.astimezone(UTC)

    def _assessment_read(
        self, assessment: CoachingAssessment, *, coach: User | None = None
    ) -> CoachingAssessmentRead:
        coach = coach or self.users.get(assessment.coach_id)
        if not coach:
            raise RuntimeError("Test coaching incoherent.")
        return CoachingAssessmentRead(
            id=assessment.id,
            assignment_id=assessment.assignment_id,
            member_id=assessment.member_id,
            coach_id=assessment.coach_id,
            coach_name=coach.full_name,
            test_type=assessment.test_type,
            measured_at=assessment.measured_at,
            metrics=assessment.metrics,
            notes=assessment.notes,
            created_at=assessment.created_at,
        )

    def _assignment_read(
        self,
        assignment: CoachMemberAssignment,
        *,
        coach: User | None = None,
        member: User | None = None,
    ) -> CoachMemberAssignmentRead:
        coach = coach or self.users.get(assignment.coach_id)
        member = member or self.users.get(assignment.member_id)
        if not coach or not member:
            raise RuntimeError("Affectation coaching incoherente.")
        return CoachMemberAssignmentRead(
            id=assignment.id,
            coach_id=assignment.coach_id,
            coach_name=coach.full_name,
            member_id=assignment.member_id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            assigned_by_id=assignment.assigned_by_id,
            started_at=assignment.started_at,
            ended_at=assignment.ended_at,
            reason=assignment.reason,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )

    def _assignment_request_read(
        self,
        request: CoachingAssignmentRequest,
        *,
        member: User | None = None,
        preferred_coach: User | None = None,
        assigned_coach: User | None = None,
        decided_by: User | None = None,
    ) -> CoachingAssignmentRequestRead:
        member = member or self.users.get(request.member_id)
        if request.preferred_coach_id and not preferred_coach:
            preferred_coach = self.users.get(request.preferred_coach_id)
        if request.assigned_coach_id and not assigned_coach:
            assigned_coach = self.users.get(request.assigned_coach_id)
        if request.decided_by_id and not decided_by:
            decided_by = self.users.get(request.decided_by_id)
        if not member:
            raise RuntimeError("Demande d'affectation coaching incoherente.")
        return CoachingAssignmentRequestRead(
            id=request.id,
            member_id=request.member_id,
            member_name=member.full_name,
            member_number=member.member_number or "",
            preferred_coach_id=request.preferred_coach_id,
            preferred_coach_name=(preferred_coach.full_name if preferred_coach else None),
            assigned_coach_id=request.assigned_coach_id,
            assigned_coach_name=(assigned_coach.full_name if assigned_coach else None),
            status=request.status,
            member_note=request.member_note,
            decision_note=request.decision_note,
            decided_by_id=request.decided_by_id,
            decided_by_name=decided_by.full_name if decided_by else None,
            decided_at=request.decided_at,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
