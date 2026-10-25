from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    monthly_price: int | None
    yearly_price: int | None
    included_minutes: int
    max_call_minutes: int
    is_custom: bool


class BillingMeOut(BaseModel):
    plan: str
    billing_cycle: Literal["monthly", "yearly"]
    minutes_limit: int
    minutes_used: int
    minutes_remaining: int
    usage_percent: float
    alert: Literal["none", "warning", "limit"]
    renews_on: date | datetime
    next_payment_amount: int | None = None
