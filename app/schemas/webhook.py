from pydantic import BaseModel

from app.models.enums import WebhookEventStatus


class WebhookOutcome(BaseModel):
    event_id: str
    status: WebhookEventStatus
    message: str
