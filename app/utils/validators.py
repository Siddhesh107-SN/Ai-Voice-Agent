"""Reusable input validators."""


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(value) > 128:
        raise ValueError("Password must be at most 128 characters long")
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("Password must contain at least one letter and one digit")
    return value


import re  # noqa: E402

_PHONE_RE = re.compile(r"^\+?\d{7,15}$")


def normalize_phone(value: str) -> str:
    """Strip spaces/dashes/brackets so the same number always compares equal."""
    cleaned = re.sub(r"[\s\-().]", "", value)
    if not _PHONE_RE.match(cleaned):
        raise ValueError("Enter a valid phone number, e.g. +919876543210")
    return cleaned


def validate_timezone(value: str) -> str:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, OSError) as exc:
        raise ValueError("Unknown timezone; use an IANA name such as Asia/Kolkata") from exc
    return value
