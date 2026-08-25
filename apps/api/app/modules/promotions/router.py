import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import DbSession, require_roles
from app.modules.promotions.schemas import PromotionCreate, PromotionRead, PromotionUpdate
from app.modules.promotions.service import PromotionService
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(tags=["Promotions"])
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("/promotions", response_model=list[PromotionRead])
def list_current_promotions(session: DbSession):
    return PromotionService(session).list_current()


@router.get("/promotions/featured", response_model=PromotionRead | None)
def featured_promotion(session: DbSession):
    return PromotionService(session).featured()


@router.get("/promotions/{slug}", response_model=PromotionRead)
def get_current_promotion(slug: str, session: DbSession):
    return PromotionService(session).current_by_slug(slug)


@router.get("/admin/promotions", response_model=list[PromotionRead])
def list_admin_promotions(session: DbSession, actor: Admin):
    return PromotionService(session).list_admin()


@router.post("/admin/promotions", response_model=PromotionRead, status_code=status.HTTP_201_CREATED)
def create_promotion(data: PromotionCreate, session: DbSession, actor: Admin):
    return PromotionService(session).create(data, actor)


@router.patch("/admin/promotions/{promotion_id}", response_model=PromotionRead)
def update_promotion(
    promotion_id: uuid.UUID,
    data: PromotionUpdate,
    session: DbSession,
    actor: Admin,
):
    return PromotionService(session).update(promotion_id, data, actor)
