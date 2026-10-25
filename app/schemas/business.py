from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class BusinessInfoOut(BaseModel):
    id: int
    name: str
    plan: str
    minutes_used: int
    minutes_limit: int
    status: str
    renews_on: date | datetime | None = None
    last_login: datetime | str | None = None


class BusinessHourItem(BaseModel):
    open: str | None = None
    close: str | None = None
    closed: bool = False


class StaffMemberOut(BaseModel):
    id: int | None = None
    name: str
    title: str | None = None
    days: list[bool]


class BusinessProfileBundleOut(BaseModel):
    business: BusinessInfoOut
    hours: list[BusinessHourItem]
    services: list[str]
    staff: list[StaffMemberOut]
    timezone: str


class StaffMemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    title: str | None = Field(default=None, max_length=100)
    days: list[bool]

    @field_validator("days")
    @classmethod
    def _validate_days(cls, v: list[bool]) -> list[bool]:
        if len(v) != 7 or not all(isinstance(x, bool) for x in v):
            raise ValueError("Available days must contain exactly 7 boolean flags")
        return v


class BusinessProfilePatchRequest(BaseModel):
    hours: list[BusinessHourItem] | None = None
    services: list[str] | None = None
    staff: list[StaffMemberIn] | None = None

    @field_validator("hours")
    @classmethod
    def _validate_hours(cls, v: list[BusinessHourItem] | None) -> list[BusinessHourItem] | None:
        if v is None:
            return v
        if len(v) != 7:
            raise ValueError("Business hours must contain exactly 7 entries (Mon-Sun)")
        for h in v:
            if not h.closed:
                if not h.open or not h.close:
                    raise ValueError("Open and close times are required when not closed")
                # format HH:MM
                o = h.open[:5]
                c = h.close[:5]
                if o >= c:
                    raise ValueError("Open time must be earlier than close time")
        return v

    @field_validator("services")
    @classmethod
    def _validate_services(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if len(v) > 50:
            raise ValueError("Maximum 50 services allowed")
        seen = set()
        for s in v:
            name = s.strip()
            if not name:
                raise ValueError("Service name cannot be empty")
            if len(name) > 60:
                raise ValueError("Service name cannot exceed 60 characters")
            if name.lower() in seen:
                raise ValueError("Services must be unique")
            seen.add(name.lower())
        return v

    @field_validator("staff")
    @classmethod
    def _validate_staff(cls, v: list[StaffMemberIn] | None) -> list[StaffMemberIn] | None:
        if v is None:
            return v
        if len(v) > 50:
            raise ValueError("Maximum 50 staff members allowed")
        return v
