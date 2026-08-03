from typing import TypeVar

from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class Repository[ModelT]:
    """Base repository carrying a transaction-scoped SQLAlchemy session."""

    def __init__(self, session: Session) -> None:
        self.session = session
