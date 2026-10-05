from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CallDirection, CallStatus
from app.schemas.agent import AgentSummary
from app.schemas.customer import CustomerSummary


class CallListItem(BaseModel):
    """Call without the heavy/sensitive fields (transcript, recording link)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    agent_id: int | None
    agent: AgentSummary | None = None
    customer_id: int | None
    customer: CustomerSummary | None = None
    phone_number: str
    direction: CallDirection
    status: CallStatus
    duration: int | None
    started_at: datetime | None
    ended_at: datetime | None
    has_recording: bool
    has_transcript: bool
    created_at: datetime


class CallDetail(CallListItem):
    """Full call. `transcript` and `recording_url` are null for CLIENT_STAFF."""

    recording_url: str | None = None
    transcript: str | None = None
