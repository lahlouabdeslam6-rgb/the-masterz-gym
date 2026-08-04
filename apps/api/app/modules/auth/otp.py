import logging
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger("masterz.otp")


class OTPProvider(ABC):
    @abstractmethod
    def send(self, phone: str, code: str) -> None:
        """Deliver an OTP without persisting the clear-text code."""


class DevelopmentOTPProvider(OTPProvider):
    def send(self, phone: str, code: str) -> None:
        if settings.environment != "development":
            raise RuntimeError(
                "Le fournisseur OTP de développement est désactivé hors développement."
            )
        masked_phone = f"***{phone[-4:]}"
        logger.warning("Development OTP for %s: %s (expires shortly)", masked_phone, code)


def get_otp_provider() -> OTPProvider:
    return DevelopmentOTPProvider()
