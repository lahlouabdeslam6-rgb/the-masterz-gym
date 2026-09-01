import uuid

from fastapi import status
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.modules.audit.service import AuditService
from app.modules.clubs.models import Club, UserClubAssignment
from app.modules.clubs.repository import ClubRepository
from app.modules.clubs.schemas import ClubUpdate, UserClubAssignmentsUpdate
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.shared.enums import UserRole


class ClubService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.clubs = ClubRepository(session)
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    def clubs_for(self, actor: User) -> list[Club]:
        if actor.role == UserRole.ADMIN:
            return self.clubs.list(active_only=True)
        return self.clubs.list_for_user(actor.id)

    def require_access(self, actor: User, club_id: uuid.UUID) -> Club:
        club = self.clubs.get(club_id)
        if not club or not club.is_active:
            raise api_error(status.HTTP_404_NOT_FOUND, "club_not_found", "Salle introuvable.")
        if actor.role == UserRole.ADMIN:
            return club
        if all(assigned.id != club_id for assigned in self.clubs.list_for_user(actor.id)):
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "club_access_denied",
                "Ce compte n'est pas affecte a cette salle.",
            )
        return club

    def update(self, club_id: uuid.UUID, data: ClubUpdate, actor: User) -> Club:
        club = self.clubs.get(club_id)
        if not club:
            raise api_error(status.HTTP_404_NOT_FOUND, "club_not_found", "Salle introuvable.")
        previous = {
            "name": club.name,
            "label": club.label,
            "address": club.address,
            "is_active": club.is_active,
        }
        for field, value in data.model_dump(exclude={"reason"}, exclude_unset=True).items():
            setattr(club, field, value)
        self.session.flush()
        self.audit.record(
            actor=actor,
            action="club.updated",
            entity_type="club",
            entity_id=club.id,
            previous_value=previous,
            new_value={
                "name": club.name,
                "label": club.label,
                "address": club.address,
                "is_active": club.is_active,
            },
            reason=data.reason,
        )
        return club

    def assign_user(
        self, user_id: uuid.UUID, data: UserClubAssignmentsUpdate, actor: User
    ) -> list[UserClubAssignment]:
        user = self.users.get(user_id)
        if not user:
            raise api_error(status.HTTP_404_NOT_FOUND, "user_not_found", "Utilisateur introuvable.")
        unique_club_ids = list(dict.fromkeys(data.club_ids))
        if user.role != UserRole.ADMIN and not unique_club_ids:
            raise api_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "club_assignment_required",
                "Au moins une salle est requise pour ce compte.",
            )
        for club_id in unique_club_ids:
            club = self.clubs.get(club_id)
            if not club or not club.is_active:
                raise api_error(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "invalid_club",
                    "Une salle selectionnee est indisponible.",
                )
        previous = [str(item.club_id) for item in self.clubs.assignments_for_user(user.id)]
        assignments = self.clubs.replace_assignments(user.id, unique_club_ids, actor.id)
        self.audit.record(
            actor=actor,
            action="user.club_assignments_changed",
            entity_type="user",
            entity_id=user.id,
            previous_value={"club_ids": previous},
            new_value={"club_ids": [str(club_id) for club_id in unique_club_ids]},
            reason=data.reason,
        )
        return assignments
