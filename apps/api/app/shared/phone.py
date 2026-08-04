import re


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 10:
        digits = f"212{digits[1:]}"
    if not 8 <= len(digits) <= 15:
        raise ValueError("Numéro de téléphone invalide")
    return f"+{digits}"
