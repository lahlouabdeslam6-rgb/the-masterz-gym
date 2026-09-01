import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import DbSession, require_roles
from app.modules.applications.schemas import ApplicationCreate, ApplicationRead, ApplicationReview
from app.modules.applications.service import ApplicationService
from app.modules.users.models import User
from app.shared.enums import ApplicationStatus, UserRole

router = APIRouter(prefix="/membership-applications", tags=["Membership applications"])
Reception = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def submit_application(data: ApplicationCreate, session: DbSession):
    return ApplicationService(session).submit(data)


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    session: DbSession,
    actor: Reception,
    application_status: Annotated[ApplicationStatus | None, Query(alias="status")] = None,
    club_id: Annotated[uuid.UUID | None, Query()] = None,
):
    if club_id:
        from app.modules.clubs.service import ClubService

        ClubService(session).require_access(actor, club_id)
    return ApplicationService(session).list(application_status, club_id)


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: uuid.UUID, session: DbSession, actor: Reception):
    from fastapi import status as http_status

    from app.core.errors import api_error

    application = ApplicationService(session).get(application_id)
    if not application:
        raise api_error(
            http_status.HTTP_404_NOT_FOUND, "application_not_found", "Demande introuvable."
        )
    return application


@router.patch("/{application_id}/review", response_model=ApplicationRead)
def review_application(
    application_id: uuid.UUID,
    data: ApplicationReview,
    session: DbSession,
    actor: Reception,
):
    return ApplicationService(session).review(application_id, data, actor)
