import uuid

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
        self, application_status: ApplicationStatus | None = None
    ) -> list[MembershipApplication]:
        statement = select(MembershipApplication).order_by(MembershipApplication.created_at.desc())
        if application_status:
            statement = statement.where(MembershipApplication.status == application_status)
        return list(self.session.scalars(statement))
