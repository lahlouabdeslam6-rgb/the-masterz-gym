import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, DbSession, require_roles
from app.core.errors import api_error
from app.modules.clubs.service import ClubService
from app.modules.memberships.repository import MembershipRepository
from app.modules.memberships.schemas import (
    MembershipPlanCreate,
    MembershipPlanRead,
    MembershipPlanUpdate,
    MemberSubscriptionSummary,
    SettingRead,
    SettingUpdate,
    SubscriptionDatesUpdate,
    SubscriptionEventRead,
    SubscriptionRead,
    SubscriptionStatusUpdate,
)
from app.modules.memberships.service import MembershipService
from app.modules.users.models import User
from app.shared.enums import ServiceType, UserRole

router = APIRouter(tags=["Memberships"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Reception = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.get("/membership-plans", response_model=list[MembershipPlanRead])
def list_plans(
    session: DbSession,
    active_only: Annotated[bool, Query()] = True,
    service_type: Annotated[ServiceType | None, Query()] = None,
    club_id: Annotated[uuid.UUID | None, Query()] = None,
):
    return MembershipRepository(session).list_plans(
        active_only=active_only, service_type=service_type, club_id=club_id
    )


@router.post("/membership-plans", response_model=MembershipPlanRead, status_code=201)
def create_plan(data: MembershipPlanCreate, session: DbSession, actor: Admin):
    return MembershipService(session).create_plan(data, actor)


@router.patch("/membership-plans/{plan_id}", response_model=MembershipPlanRead)
def update_plan(plan_id: uuid.UUID, data: MembershipPlanUpdate, session: DbSession, actor: Admin):
    return MembershipService(session).update_plan(plan_id, data, actor)


@router.delete("/membership-plans/{plan_id}", status_code=204)
def delete_plan(plan_id: uuid.UUID, session: DbSession, actor: Admin) -> None:
    MembershipService(session).delete_plan(plan_id, actor)


@router.get("/members/subscription-summaries", response_model=list[MemberSubscriptionSummary])
def list_member_subscription_summaries(
    session: DbSession,
    actor: Reception,
    query: Annotated[str | None, Query(max_length=160)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    club_id: Annotated[uuid.UUID | None, Query()] = None,
):
    if club_id:
        ClubService(session).require_access(actor, club_id)
    elif actor.role == UserRole.RECEPTIONIST:
        assigned = ClubService(session).clubs_for(actor)
        club_id = assigned[0].id if assigned else None
        if club_id is None:
            raise api_error(403, "club_access_denied", "Aucune salle affectee.")
    return MembershipService(session).list_member_subscription_summaries(
        query=query, limit=limit, club_id=club_id
    )


@router.get("/members/{member_id}/subscriptions", response_model=list[SubscriptionRead])
def list_member_subscriptions(
    member_id: uuid.UUID,
    session: DbSession,
    actor: CurrentUser,
    club_id: Annotated[uuid.UUID | None, Query()] = None,
):
    if actor.role == UserRole.MEMBER and actor.id != member_id:
        raise api_error(403, "permission_denied", "Accès interdit.")
    if actor.role not in {UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MEMBER}:
        raise api_error(403, "permission_denied", "Accès interdit.")
    if actor.role == UserRole.RECEPTIONIST:
        if club_id:
            ClubService(session).require_access(actor, club_id)
        else:
            assigned = ClubService(session).clubs_for(actor)
            club_id = assigned[0].id if assigned else None
            if club_id is None:
                raise api_error(403, "club_access_denied", "Aucune salle affectee.")
    memberships = MembershipRepository(session)
    service = MembershipService(session)
    return [
        SubscriptionRead.model_validate(item).model_copy(
            update={"effective_status": service.effective_status(item)}
        )
        for item in memberships.list_member_subscriptions(member_id, club_id)
    ]


@router.patch("/subscriptions/{subscription_id}/status", response_model=SubscriptionRead)
def update_subscription_status(
    subscription_id: uuid.UUID,
    data: SubscriptionStatusUpdate,
    session: DbSession,
    actor: Reception,
):
    service = MembershipService(session)
    subscription = service.repository.get_subscription(subscription_id)
    if not subscription:
        raise api_error(404, "subscription_not_found", "Abonnement introuvable.")
    ClubService(session).require_access(actor, subscription.club_id)
    subscription = service.update_status(subscription_id, data, actor)
    return SubscriptionRead.model_validate(subscription).model_copy(
        update={"effective_status": service.effective_status(subscription)}
    )


@router.patch("/subscriptions/{subscription_id}/dates", response_model=SubscriptionRead)
def update_subscription_dates(
    subscription_id: uuid.UUID,
    data: SubscriptionDatesUpdate,
    session: DbSession,
    actor: Reception,
):
    service = MembershipService(session)
    subscription = service.repository.get_subscription(subscription_id)
    if not subscription:
        raise api_error(404, "subscription_not_found", "Abonnement introuvable.")
    ClubService(session).require_access(actor, subscription.club_id)
    subscription = service.update_dates(subscription_id, data, actor)
    return SubscriptionRead.model_validate(subscription).model_copy(
        update={"effective_status": service.effective_status(subscription)}
    )


@router.get("/subscriptions/{subscription_id}/events", response_model=list[SubscriptionEventRead])
def list_subscription_events(subscription_id: uuid.UUID, session: DbSession, actor: Reception):
    repository = MembershipRepository(session)
    subscription = repository.get_subscription(subscription_id)
    if not subscription:
        raise api_error(404, "subscription_not_found", "Abonnement introuvable.")
    ClubService(session).require_access(actor, subscription.club_id)
    return repository.list_events(subscription_id)


@router.put("/membership-settings/{key}", response_model=SettingRead)
def update_membership_setting(key: str, data: SettingUpdate, session: DbSession, actor: Admin):
    return MembershipService(session).update_setting(key, data, actor)


@router.get("/membership-settings", response_model=list[SettingRead])
def list_membership_settings(session: DbSession, actor: Admin):
    return MembershipRepository(session).list_settings()
