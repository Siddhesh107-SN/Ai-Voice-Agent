from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    """One client's stats. `today_*` figures use the client's own timezone."""

    total_appointments: int = Field(ge=0)
    today_appointments: int = Field(ge=0)
    scheduled_appointments: int = Field(ge=0, description="Scheduled, confirmed or rescheduled")
    cancelled_appointments: int = Field(ge=0)
    completed_appointments: int = Field(ge=0)
    total_customers: int = Field(ge=0)
    total_agents: int = Field(ge=0)
    active_agents: int = Field(ge=0)
    total_calls: int = Field(ge=0)
    calls_today: int = Field(ge=0)


class PlatformDashboardSummary(BaseModel):
    """Platform-wide stats across every client. `calls_today` is a UTC calendar day."""

    total_clients: int = Field(ge=0)
    active_clients: int = Field(ge=0)
    disabled_clients: int = Field(ge=0)
    total_users: int = Field(ge=0)
    total_agents: int = Field(ge=0)
    total_customers: int = Field(ge=0)
    total_appointments: int = Field(ge=0)
    total_calls: int = Field(ge=0)
    calls_today: int = Field(ge=0)
