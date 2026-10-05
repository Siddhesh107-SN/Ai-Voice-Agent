"""Domain enums shared by models and schemas."""
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CLIENT_ADMIN = "client_admin"
    CLIENT_STAFF = "client_staff"


class ClientStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class AgentProvider(str, enum.Enum):
    SARVAM = "sarvam"
    OTHER = "other_provider"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


class AppointmentAction(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class ChangeSource(str, enum.Enum):
    USER = "user"
    AI_AGENT = "ai_agent"
    SYSTEM = "system"


class CallDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class CallStatus(str, enum.Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    MISSED = "missed"


class EnquiryStatus(str, enum.Enum):
    OPEN = "open"
    ANSWERED = "answered"
    CLOSED = "closed"


class WebhookEventStatus(str, enum.Enum):
    RECEIVED = "received"
    PROCESSED = "processed"
    DUPLICATE = "duplicate"
    FAILED = "failed"
