from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.applications.models import MembershipApplication
from app.shared.enums import ApplicationStatus


class ApplicationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, application: MembershipApplication) -> MembershipApplication:
        self.session.add(application)
        self.session.flush()
        return application

    def get(self, application_id: uuid.UUID) -> MembershipApplication | None:
        return self.session.get(MembershipApplication, application_id)

    def list(
        self,
        application_status: ApplicationStatus | None = None,
        club_id: uuid.UUID | None = None,
    ) -> list[MembershipApplication]:
        statement = select(MembershipApplication).order_by(MembershipApplication.created_at.desc())
        if application_status:
            statement = statement.where(MembershipApplication.status == application_status)
        if club_id:
            statement = statement.where(MembershipApplication.club_id == club_id)
        return list(self.session.scalars(statement))

    def stale_pending(self, cutoff: datetime) -> list[MembershipApplication]:
        statement = select(MembershipApplication).where(
            MembershipApplication.status == ApplicationStatus.PENDING,
            MembershipApplication.updated_at < cutoff,
        )
        return list(self.session.scalars(statement))

    def delete(self, application: MembershipApplication) -> None:
        self.session.delete(application)
