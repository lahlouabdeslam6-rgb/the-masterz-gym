import uuid
from datetime import date

from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session

from app.modules.memberships.models import Subscription
from app.modules.recovery.models import RecoveryVisit
from app.modules.users.models import User
from app.shared.enums import ServiceType, SubscriptionStatus, UserRole


class RecoveryRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def lock_idempotency_key(self, key: str) -> None:
        self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"recovery:{key}"},
        )

    def visit_by_idempotency_key(self, key: str) -> RecoveryVisit | None:
        return self.session.scalar(
            select(RecoveryVisit).where(RecoveryVisit.idempotency_key == key)
        )

    def add_visit(self, visit: RecoveryVisit) -> RecoveryVisit:
        self.session.add(visit)
        self.session.flush()
        return visit

    def list_visits(
        self, member_id: uuid.UUID, club_id: uuid.UUID, *, limit: int = 100
    ) -> list[RecoveryVisit]:
        return list(
            self.session.scalars(
                select(RecoveryVisit)
                .where(
                    RecoveryVisit.member_id == member_id,
                    RecoveryVisit.club_id == club_id,
                )
                .order_by(RecoveryVisit.occurred_at.desc(), RecoveryVisit.created_at.desc())
                .limit(limit)
            )
        )

    def list_subscriptions(
        self, member_id: uuid.UUID, club_id: uuid.UUID
    ) -> list[Subscription]:
        return list(
            self.session.scalars(
                select(Subscription)
                .where(
                    Subscription.member_id == member_id,
                    Subscription.club_id == club_id,
                    Subscription.service_type == ServiceType.RECOVERY,
                )
                .order_by(Subscription.created_at.desc())
            )
        )

    def usable_subscription_for_update(
        self, member_id: uuid.UUID, club_id: uuid.UUID, on_date: date
    ) -> Subscription | None:
        return self.session.scalar(
            select(Subscription)
            .where(
                Subscription.member_id == member_id,
                Subscription.club_id == club_id,
                Subscription.service_type == ServiceType.RECOVERY,
                Subscription.starts_on <= on_date,
                Subscription.ends_on >= on_date,
                Subscription.status.not_in(
                    (
                        SubscriptionStatus.SUSPENDED,
                        SubscriptionStatus.EXPIRED,
                        SubscriptionStatus.CANCELLED,
                    )
                ),
                Subscription.remaining_sessions.is_not(None),
                Subscription.remaining_sessions > 0,
            )
            .order_by(Subscription.created_at.desc())
            .with_for_update()
            .limit(1)
        )

    def list_clients(
        self,
        club_id: uuid.UUID,
        *,
        query: str | None = None,
        limit: int = 100,
    ) -> list[tuple[User, Subscription]]:
        statement = (
            select(User, Subscription)
            .join(Subscription, Subscription.member_id == User.id)
            .where(
                User.role == UserRole.MEMBER,
                Subscription.club_id == club_id,
                Subscription.service_type == ServiceType.RECOVERY,
            )
            .order_by(User.full_name, Subscription.created_at.desc())
        )
        if query and query.strip():
            pattern = f"%{query.strip()}%"
            statement = statement.where(
                or_(
                    User.full_name.ilike(pattern),
                    User.phone.ilike(pattern),
                    User.member_number.ilike(pattern),
                )
            )
        rows = self.session.execute(statement)
        clients: list[tuple[User, Subscription]] = []
        seen: set[uuid.UUID] = set()
        for member, subscription in rows:
            if member.id in seen:
                continue
            seen.add(member.id)
            clients.append((member, subscription))
            if len(clients) >= limit:
                break
        return clients
