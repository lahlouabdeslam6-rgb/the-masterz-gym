from datetime import date

import pytest

from app.shared.phone import normalize_phone
from app.shared.time import add_months


def test_phone_normalization_supports_local_moroccan_format() -> None:
    assert normalize_phone("06 12-34-56-78") == "+212612345678"


def test_phone_normalization_rejects_short_values() -> None:
    with pytest.raises(ValueError, match="invalide"):
        normalize_phone("123")


def test_add_months_handles_month_end() -> None:
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
