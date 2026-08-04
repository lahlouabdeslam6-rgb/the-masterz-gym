from typing import Any

from fastapi import HTTPException, status


def api_error(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, "details": details or {}},
    )


unauthorized = lambda: api_error(  # noqa: E731
    status.HTTP_401_UNAUTHORIZED, "authentication_required", "Authentification requise."
)
