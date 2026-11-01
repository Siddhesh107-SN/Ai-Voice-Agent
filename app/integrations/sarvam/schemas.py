"""Wire schemas for Sarvam. Field names are illustrative pending Sarvam's exact webhook
contract — adjust here (and only here) once that's confirmed; nothing downstream depends
on the wire shape directly."""
import math
from datetime import date, datetime, time
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

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


class SarvamTranscriptItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: Literal["agent", "user"]
    en_text: str


class SarvamWebhookConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    url: str | None = None
    metadata: dict[str, Any] | None = None


class SarvamOutboundPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    attempt_id: str = Field(min_length=1, max_length=255)
    status: Literal["connected", "no_answer", "busy", "failed"]
    channel_info: dict[str, Any] | None = None
    duration: int | float | None = None
    interaction_id: str | None = None
    failure_reason: str | None = None
    final_agent_variables: dict[str, Any] | None = None
    webhook_config: SarvamWebhookConfig | None = None
    interaction_transcript: list[SarvamTranscriptItem] | None = None


class SarvamCallCompletedTranscriptItem(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    role: str | None = None
    en_text: str | None = None
    indic_text: str | None = None


class SarvamCallCompletedPayload(BaseModel):
    """Lenient schema for Sarvam's call-completed callback; unknown fields are ignored."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    app_id: str | None = Field(default=None, max_length=255)
    interaction_id: str | None = Field(default=None, max_length=255)
    attempt_id: str | None = Field(default=None, max_length=255)
    from_number: str | None = Field(
        default=None,
        validation_alias=AliasChoices("from_number", "caller_number", "caller_phone_number"),
    )
    to_number: str | None = Field(
        default=None,
        validation_alias=AliasChoices("to_number", "dialed_number", "dialed_phone_number"),
    )
    phone_number: str | None = None
    agent_phone_number: str | None = None
    duration: float | None = Field(default=None, ge=0, le=2147483647)
    completion_status: str | None = None
    connectivity_status: str | None = None
    start_time: datetime | None = Field(
        default=None, validation_alias=AliasChoices("start_time", "started_at")
    )
    end_time: datetime | None = Field(
        default=None, validation_alias=AliasChoices("end_time", "ended_at")
    )
    interaction_transcript: list[SarvamCallCompletedTranscriptItem] | None = None
    final_agent_variables: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    webhook_config: SarvamWebhookConfig | None = None

    @field_validator("app_id", "interaction_id", "attempt_id", mode="before")
    @classmethod
    def _blank_ids_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("duration")
    @classmethod
    def _finite_duration(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("duration must be finite")
        return value

    @model_validator(mode="after")
    def _require_interaction_or_attempt(self) -> "SarvamCallCompletedPayload":
        if self.interaction_id is None and self.attempt_id is None:
            raise ValueError("interaction_id or attempt_id is required")
        return self


class SarvamAppointmentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    customer_phone: str
    customer_name: str | None = None
    appointment_id: int | None = None
    appointment_date: date | None = None
    appointment_time: time | None = None
    notes: str | None = Field(default=None, max_length=2000)
    reason: str | None = Field(default=None, max_length=500)
    new_date: date | None = None
    new_time: time | None = None

    @field_validator(
        "customer_name", "appointment_id", "appointment_date", "appointment_time",
        "notes", "reason", "new_date", "new_time", mode="before")
    @classmethod
    def _blank_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_times(self) -> "SarvamAppointmentRequest":
        if self.appointment_time is not None:
            self.appointment_time = self.appointment_time.replace(second=0, microsecond=0)
        if self.new_time is not None:
            self.new_time = self.new_time.replace(second=0, microsecond=0)
        return self
