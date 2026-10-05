from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AppointmentAction, AppointmentStatus, ChangeSource
from app.schemas.customer import CustomerSummary


def _clean_time(value: time) -> time:
    if value.tzinfo is not None:
        raise ValueError("Time must not include a timezone offset")
    return value.replace(second=0, microsecond=0)


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    customer_id: int
    customer: CustomerSummary | None = None
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    customer_id: int
    appointment_date: date
    appointment_time: time
    status: Literal[AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] = \
        AppointmentStatus.SCHEDULED
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("appointment_time")
    @classmethod
    def _time(cls, v: time) -> time:
        return _clean_time(v)


class AppointmentUpdate(BaseModel):
    """Date/time changes and cancellation have their own endpoints so they are audited."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    customer_id: int | None = None
    status: Literal[AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED,
                    AppointmentStatus.COMPLETED] | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appointment_id: int
    action: AppointmentAction
    source: ChangeSource
    actor_user_id: int | None
    old_date: date | None
    old_time: time | None
    new_date: date | None
    new_time: time | None
    old_status: str | None
    new_status: str | None
    reason: str | None
    created_at: datetime


class CancelRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reason: str | None = Field(default=None, max_length=500)


class RescheduleRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    new_date: date
    new_time: time
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("new_time")
    @classmethod
    def _time(cls, v: time) -> time:
        return _clean_time(v)
