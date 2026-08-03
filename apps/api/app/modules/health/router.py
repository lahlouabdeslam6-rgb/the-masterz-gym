from fastapi import APIRouter

from app.modules.health.schemas import HealthResponse
from app.modules.health.service import HealthService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthService().get_status()
