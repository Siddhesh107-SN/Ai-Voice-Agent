from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict

from app.models.enums import ChangeSource
from app.schemas.customer import CustomerSummary


class CancellationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    appointment_id: int
    customer_id: int
    customer: CustomerSummary | None = None
    appointment_date: date
    appointment_time: time
    reason: str | None
    source: ChangeSource
    cancelled_by_user_id: int | None
    created_at: datetime
