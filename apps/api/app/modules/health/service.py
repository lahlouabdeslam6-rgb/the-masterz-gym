from app.modules.health.schemas import HealthResponse


class HealthService:
    """Provides process-level health information without database access."""

    def get_status(self) -> HealthResponse:
        return HealthResponse(status="ok", service="masterz-gym-api")
