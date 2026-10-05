"""Wire schemas for Sarvam. Field names are illustrative pending Sarvam's exact webhook
contract — adjust here (and only here) once that's confirmed; nothing downstream depends
on the wire shape directly."""
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SarvamEventType = Literal[
    "call_started", "call_completed", "appointment_created",
    "appointment_cancelled", "appointment_rescheduled",
]


class SarvamCallData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    provider_call_id: str = Field(min_length=1, max_length=255)
    phone_number: str
    direction: Literal["inbound", "outbound"] = "inbound"
    status: Literal["initiated", "in_progress", "completed", "failed", "missed"] | None = None
    duration: int | None = Field(default=None, ge=0)
    recording_url: str | None = None
    transcript: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class SarvamAppointmentData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    customer_phone: str
    customer_name: str | None = None
    appointment_id: int | None = None
    appointment_date: date | None = None
    appointment_time: time | None = None
    new_date: date | None = None
    new_time: time | None = None
    reason: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)


class SarvamWebhookEnvelope(BaseModel):
    """One incoming event. `agent_id` is Sarvam's own agent id (our `provider_agent_id`),
    which is how the tenant is resolved — the payload never carries our internal client_id."""

    model_config = ConfigDict(extra="ignore")

    event_id: str = Field(min_length=1, max_length=255)
    event_type: SarvamEventType
    agent_id: str = Field(min_length=1, max_length=255)
    occurred_at: datetime | None = None
    call: SarvamCallData | None = None
    appointment: SarvamAppointmentData | None = None

    @model_validator(mode="after")
    def _require_matching_data(self) -> "SarvamWebhookEnvelope":
        needs_call = self.event_type in ("call_started", "call_completed")
        needs_appointment = self.event_type in (
            "appointment_created", "appointment_cancelled", "appointment_rescheduled")
        if needs_call and self.call is None:
            raise ValueError(f"'call' data is required for event_type={self.event_type}")
        if needs_appointment and self.appointment is None:
            raise ValueError(f"'appointment' data is required for event_type={self.event_type}")
        if needs_appointment and self.event_type == "appointment_rescheduled":
            if self.appointment.new_date is None or self.appointment.new_time is None:
                raise ValueError("'appointment.new_date'/'new_time' are required to reschedule")
        return self
