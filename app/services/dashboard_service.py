"""Read-only aggregate statistics. Every client-scoped query is filtered by client_id;
`platform_summary` is the one place in the app that intentionally queries across all tenants,
and it is only ever reachable by SUPER_ADMIN (enforced at the route, not here)."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.appointment import Appointment
from app.models.client import Client
from app.models.customer import Customer
from app.models.enums import AgentStatus, AppointmentStatus, ClientStatus
from app.models.user import User
from app.repositories.call_repository import CALL_TIME
from app.models.call import Call
from app.repositories.client_repository import ClientRepository
from app.schemas.dashboard import DashboardSummary, PlatformDashboardSummary
from app.utils.helpers import day_bounds_utc, now_in_timezone

_OPEN_APPOINTMENT_STATUSES = (AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED,
                             AppointmentStatus.RESCHEDULED)


def _count(db: Session, *filters) -> int:
    query = select(func.count()).select_from(select(1).where(*filters).subquery())
    return db.scalar(query) or 0


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def client_summary(self, client_id: int) -> DashboardSummary:
        client = ClientRepository(self.db).get_by_id(client_id)
        tz = client.timezone if client else "UTC"
        today = now_in_timezone(tz).date()
        start, end = day_bounds_utc(today, tz)

        return DashboardSummary(
            total_appointments=_count(self.db, Appointment.client_id == client_id),
            today_appointments=_count(self.db, Appointment.client_id == client_id,
                                      Appointment.appointment_date == today),
            scheduled_appointments=_count(self.db, Appointment.client_id == client_id,
                                          Appointment.status.in_(_OPEN_APPOINTMENT_STATUSES)),
            cancelled_appointments=_count(self.db, Appointment.client_id == client_id,
                                          Appointment.status == AppointmentStatus.CANCELLED),
            completed_appointments=_count(self.db, Appointment.client_id == client_id,
                                          Appointment.status == AppointmentStatus.COMPLETED),
            total_customers=_count(self.db, Customer.client_id == client_id),
            total_agents=_count(self.db, Agent.client_id == client_id),
            active_agents=_count(self.db, Agent.client_id == client_id,
                                 Agent.status == AgentStatus.ACTIVE),
            total_calls=_count(self.db, Call.client_id == client_id),
            calls_today=_count(self.db, Call.client_id == client_id,
                               CALL_TIME >= start, CALL_TIME < end),
        )

    def platform_summary(self) -> PlatformDashboardSummary:
        today = now_in_timezone("UTC").date()
        start, end = day_bounds_utc(today, "UTC")

        return PlatformDashboardSummary(
            total_clients=_count(self.db, Client.id.isnot(None)),
            active_clients=_count(self.db, Client.status == ClientStatus.ACTIVE),
            disabled_clients=_count(self.db, Client.status == ClientStatus.DISABLED),
            total_users=_count(self.db, User.id.isnot(None)),
            total_agents=_count(self.db, Agent.id.isnot(None)),
            total_customers=_count(self.db, Customer.id.isnot(None)),
            total_appointments=_count(self.db, Appointment.id.isnot(None)),
            total_calls=_count(self.db, Call.id.isnot(None)),
            calls_today=_count(self.db, CALL_TIME >= start, CALL_TIME < end),
        )
