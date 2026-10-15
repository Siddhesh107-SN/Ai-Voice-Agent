"""Import every model so Base.metadata (and Alembic) sees all tables."""
from app.models.agent import Agent
from app.models.appointment import Appointment, AppointmentHistory
from app.models.audit_log import AuditLog
from app.models.call import Call
from app.models.call_attempt import CallAttempt
from app.models.cancellation import Cancellation
from app.models.client import Client
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.user import User
from app.models.webhook_event import WebhookEvent

__all__ = [
    "Agent", "Appointment", "AppointmentHistory", "AuditLog", "Call", "CallAttempt", "Cancellation", "Client",
    "Customer", "Enquiry", "User", "WebhookEvent",
]
