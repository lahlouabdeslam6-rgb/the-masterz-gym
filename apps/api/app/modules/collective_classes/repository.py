import uuid
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.collective_classes.models import (
    CollectiveClassReservation,
    CollectiveClassSession,
    CollectiveClassType,
)
from app.modules.memberships.models import Subscription
from app.modules.users.models import User
from app.shared.enums import (
    CollectiveClassReservationStatus,
    CollectiveClassSessionStatus,
    ServiceType,
    SubscriptionStatus,
)


class CollectiveClassRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add_class_type(self, class_type: CollectiveClassType) -> CollectiveClassType:
        self.session.add(class_type)
        self.session.flush()
        return class_type

    def save_class_type(self, class_type: CollectiveClassType) -> CollectiveClassType:
        self.session.add(class_type)
        self.session.flush()
        return class_type

    def get_class_type(self, class_type_id: uuid.UUID) -> CollectiveClassType | None:
        return self.session.get(CollectiveClassType, class_type_id)

    def list_class_types(
        self, club_id: uuid.UUID, *, active_only: bool = True
    ) -> list[CollectiveClassType]:
        statement = select(CollectiveClassType).where(CollectiveClassType.club_id == club_id)
        if active_only:
            statement = statement.where(CollectiveClassType.is_active.is_(True))
        return list(self.session.scalars(statement.order_by(CollectiveClassType.name)))

    def add_session(self, class_session: CollectiveClassSession) -> CollectiveClassSession:
        self.session.add(class_session)
        self.session.flush()
        return class_session

    def save_session(self, class_session: CollectiveClassSession) -> CollectiveClassSession:
        self.session.add(class_session)
        self.session.flush()
        return class_session

    def get_session(
        self, session_id: uuid.UUID, *, for_update: bool = False
    ) -> CollectiveClassSession | None:
        statement = select(CollectiveClassSession).where(CollectiveClassSession.id == session_id)
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def list_sessions(
        self,
        club_id: uuid.UUID,
        *,
        coach_id: uuid.UUID | None = None,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
        include_history: bool = False,
    ) -> list[CollectiveClassSession]:
        statement = select(CollectiveClassSession).where(CollectiveClassSession.club_id == club_id)
        if coach_id:
            statement = statement.where(CollectiveClassSession.coach_id == coach_id)
        if from_at:
            statement = statement.where(CollectiveClassSession.ends_at > from_at)
        if to_at:
            statement = statement.where(CollectiveClassSession.starts_at < to_at)
        if not include_history:
            statement = statement.where(
                CollectiveClassSession.status == CollectiveClassSessionStatus.SCHEDULED
            )
        order = (
            CollectiveClassSession.starts_at.desc()
            if include_history
            else CollectiveClassSession.starts_at
        )
        return list(self.session.scalars(statement.order_by(order)))

    def reservations_for_session(self, session_id: uuid.UUID) -> list[CollectiveClassReservation]:
        return list(
            self.session.scalars(
                select(CollectiveClassReservation)
                .where(CollectiveClassReservation.session_id == session_id)
                .order_by(
                    CollectiveClassReservation.waitlist_position.asc().nullsfirst(),
                    CollectiveClassReservation.created_at,
                )
            )
        )

    def reservation_counts(self, session_id: uuid.UUID) -> tuple[int, int]:
        confirmed = int(
            self.session.scalar(
                select(func.count(CollectiveClassReservation.id)).where(
                    CollectiveClassReservation.session_id == session_id,
                    CollectiveClassReservation.status.in_(
                        (
                            CollectiveClassReservationStatus.CONFIRMED,
                            CollectiveClassReservationStatus.ATTENDED,
                        )
                    ),
                )
            )
            or 0
        )
        waitlisted = int(
            self.session.scalar(
                select(func.count(CollectiveClassReservation.id)).where(
                    CollectiveClassReservation.session_id == session_id,
                    CollectiveClassReservation.status
                    == CollectiveClassReservationStatus.WAITLISTED,
                )
            )
            or 0
        )
        return confirmed, waitlisted

    def get_reservation(
        self, reservation_id: uuid.UUID, *, for_update: bool = False
    ) -> CollectiveClassReservation | None:
        statement = select(CollectiveClassReservation).where(
            CollectiveClassReservation.id == reservation_id
        )
        if for_update:
            statement = statement.with_for_update()
        return self.session.scalar(statement)

    def reservation_for_member(
        self, session_id: uuid.UUID, member_id: uuid.UUID
    ) -> CollectiveClassReservation | None:
        return self.session.scalar(
            select(CollectiveClassReservation).where(
                CollectiveClassReservation.session_id == session_id,
                CollectiveClassReservation.member_id == member_id,
            )
        )

    def add_reservation(
        self, reservation: CollectiveClassReservation
    ) -> CollectiveClassReservation:
        self.session.add(reservation)
        self.session.flush()
        return reservation

    def save_reservation(
        self, reservation: CollectiveClassReservation
    ) -> CollectiveClassReservation:
        self.session.add(reservation)
        self.session.flush()
        return reservation

    def next_waitlisted(self, session_id: uuid.UUID) -> CollectiveClassReservation | None:
        return self.session.scalar(
            select(CollectiveClassReservation)
            .where(
                CollectiveClassReservation.session_id == session_id,
                CollectiveClassReservation.status == CollectiveClassReservationStatus.WAITLISTED,
            )
            .order_by(
                CollectiveClassReservation.waitlist_position,
                CollectiveClassReservation.created_at,
            )
            .with_for_update()
            .limit(1)
        )

    def next_waitlist_position(self, session_id: uuid.UUID) -> int:
        current = self.session.scalar(
            select(func.max(CollectiveClassReservation.waitlist_position)).where(
                CollectiveClassReservation.session_id == session_id,
                CollectiveClassReservation.status == CollectiveClassReservationStatus.WAITLISTED,
            )
        )
        return int(current or 0) + 1

    def list_member_reservations(
        self, member_id: uuid.UUID, *, limit: int = 200
    ) -> list[CollectiveClassReservation]:
        return list(
            self.session.scalars(
                select(CollectiveClassReservation)
                .where(CollectiveClassReservation.member_id == member_id)
                .order_by(CollectiveClassReservation.created_at.desc())
                .limit(limit)
            )
        )

    def active_gym_subscription(
        self, member_id: uuid.UUID, club_id: uuid.UUID, on_date: date
    ) -> Subscription | None:
        return self.session.scalar(
            select(Subscription)
            .where(
                Subscription.member_id == member_id,
                Subscription.club_id == club_id,
                Subscription.service_type == ServiceType.GYM,
                Subscription.starts_on <= on_date,
                Subscription.ends_on >= on_date,
                Subscription.status.in_(
                    (
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.EXPIRING_SOON,
                        SubscriptionStatus.GRACE_PERIOD,
                    )
                ),
            )
            .order_by(Subscription.ends_on.desc())
            .limit(1)
        )

    def get_user(self, user_id: uuid.UUID) -> User | None:
        return self.session.get(User, user_id)
