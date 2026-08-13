import re

_NON_DIGIT = re.compile(r"\D+")


class InvalidPhoneError(ValueError):
    pass


def normalize_ng_phone(raw: str) -> str:
    """Normalize a Nigerian mobile number to E.164 (+234XXXXXXXXXX)."""
    if not raw or not raw.strip():
        raise InvalidPhoneError("Phone number is required")

    digits = _NON_DIGIT.sub("", raw.strip())
    if digits.startswith("234") and len(digits) == 13:
        local = digits[3:]
    elif digits.startswith("0") and len(digits) == 11:
        local = digits[1:]
    elif len(digits) == 10:
        local = digits
    else:
        raise InvalidPhoneError("Enter a valid Nigerian phone number")

    if local[0] not in "789":
        raise InvalidPhoneError("Enter a valid Nigerian mobile number")
    if len(local) != 10:
        raise InvalidPhoneError("Enter a valid Nigerian phone number")

    return f"+234{local}"


def phone_for_sms(e164: str) -> str:
    """Termii-style destination without plus (234…)."""
    return e164.lstrip("+")
