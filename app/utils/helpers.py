"""Small shared helpers."""
from collections.abc import Iterable
from datetime import date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def drop_nulls(changes: dict, nullable: Iterable[str] = ()) -> dict:
    """Ignore explicit nulls for columns that are NOT NULL (only `nullable` fields may be cleared)."""
    allowed = set(nullable)
    return {k: v for k, v in changes.items() if v is not None or k in allowed}


def now_in_timezone(tz_name: str) -> datetime:
    """Current wall-clock time (naive) in the given IANA timezone; falls back to UTC."""
    try:
        zone = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        zone = ZoneInfo("UTC")
    return datetime.now(zone).replace(tzinfo=None)


def is_in_past(day: date, at: time, tz_name: str) -> bool:
    now = now_in_timezone(tz_name).replace(second=0, microsecond=0)
    return datetime.combine(day, at) < now


def day_bounds_utc(day: date, tz_name: str) -> tuple[datetime, datetime]:
    """[start, end) of a calendar day in the given timezone, as aware datetimes."""
    from datetime import timedelta

    try:
        zone = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        zone = ZoneInfo("UTC")
    start = datetime.combine(day, time.min, tzinfo=zone)
    return start, datetime.combine(day + timedelta(days=1), time.min, tzinfo=zone)
