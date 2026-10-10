from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Literal

# --- Common / Pagination ---
class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int

class MessageResponse(BaseModel):
    success: bool
    message: str

# --- Auth ---
class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    client_id: str
    is_active: bool
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminCodeVerifyRequest(BaseModel):
    access_code: str

class AdminCodeVerifyResponse(BaseModel):
    success: bool
    message: str
    unlocked_until: Optional[str] = None
    user_role: Optional[str] = None

# --- Appointments ---
class AppointmentBase(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    date: str
    time: str
    service: str
    notes: Optional[str] = None
    agent_id: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    customer_id: Optional[str] = None

class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    service: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentReschedule(BaseModel):
    new_date: str
    new_time: str
    reason: Optional[str] = None

class AppointmentCancel(BaseModel):
    reason: Optional[str] = "Customer request"

class AppointmentHistoryOut(BaseModel):
    id: str
    appointment_id: str
    event: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    actor: str
    actor_type: str
    timestamp: str

class AppointmentOut(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    date: str
    time: str
    day_of_week: str
    service: str
    status: str
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    background: Optional[str] = None
    foreground: Optional[str] = None
    created_at: str
    updated_at: str

# --- Customers ---
class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class CustomerOut(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    notes: Optional[str] = None
    total_appointments: Optional[int] = 0
    created_at: str

# --- Calls ---
class TranscriptLine(BaseModel):
    speaker: str
    text: str
    time: str

class CallOut(BaseModel):
    id: str
    date_time: str
    direction: str
    status: str
    duration_seconds: int
    agent_id: str
    agent_name: str
    customer_id: str
    customer_name: str
    customer_phone: str
    has_recording: bool
    recording_url: Optional[str] = None
    has_transcript: bool
    transcript: Optional[List[TranscriptLine]] = None
    summary: Optional[str] = None

# --- Cancellations ---
class CancellationOut(BaseModel):
    id: str
    appointment_id: str
    original_date: str
    original_time: str
    customer_id: str
    customer_name: str
    customer_phone: str
    reason: Optional[str] = None
    cancelled_by: str
    cancelled_by_name: str
    timestamp: str

# --- AI Agents ---
class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    phone_number: str
    provider: str
    status: str = "active"
    configuration: Optional[Dict[str, Any]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None

class AgentStatusToggle(BaseModel):
    status: Literal["active", "inactive", "offline", "training"]

class AgentOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    phone_number: str
    provider: str
    status: str
    voice_id: Optional[str] = None
    accent: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    language: Optional[str] = "English"
    health: Optional[str] = "HEALTHY"
    created_at: str
    last_active: Optional[str] = None

# --- Staff Users ---
class StaffCreate(BaseModel):
    name: str
    email: str
    password: Optional[str] = "staff123"
    role: str = "STAFF"

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# --- Business Profile ---
class BusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    services: Optional[List[str]] = None

class BusinessProfileOut(BaseModel):
    id: str
    business_name: str
    owner_name: Optional[str] = None
    email: str
    phone: str
    address: str
    timezone: str
    status: str
    plan: Optional[str] = "PRO"
    logo: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    services: Optional[List[str]] = None
    created_at: str
    last_active: Optional[str] = None

# --- Audit Logs ---
class AuditLogOut(BaseModel):
    id: str
    timestamp: str
    level: str
    service: str
    business_id: Optional[str] = None
    business_name: str
    user_id: Optional[str] = None
    user_name: str
    role: str
    event: str
    status: str
    details: str
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# --- Super Admin ---
class PlatformBusinessOut(BaseModel):
    id: str
    business_name: str
    owner_name: str
    email: str
    phone: str
    status: str
    plan: str
    active_agents: int
    total_calls: int
    revenue: float
    last_activity: Optional[str] = None
    last_active: Optional[str] = None
    created_at: str
    address: Optional[str] = None
    timezone: Optional[str] = None
    description: Optional[str] = None

class PlatformBusinessStatusUpdate(BaseModel):
    status: Literal["active", "inactive", "suspended", "trial"]

class PlatformRevenueOut(BaseModel):
    total_revenue: float
    this_month: float
    this_year: float
    active_subscriptions: int
    revenue_growth_percentage: float
    total_transactions: int
    revenue_over_time: List[Dict[str, Any]]
    revenue_by_plan: List[Dict[str, Any]]
    revenue_by_business: List[Dict[str, Any]]

class SuperAdminDashboardOut(BaseModel):
    total_businesses: int
    active_businesses: int
    total_users: int
    active_agents: int
    total_calls: int
    total_revenue: float
    monthly_revenue: float
    system_status: str
    recent_logs: List[AuditLogOut]
    top_businesses: List[PlatformBusinessOut]

class ServiceHealthOut(BaseModel):
    name: str
    status: str
    latency_ms: int
    last_checked: str
    description: str

class SystemHealthOut(BaseModel):
    frontend: ServiceHealthOut
    fastapi_backend: ServiceHealthOut
    database: ServiceHealthOut
    ai_voice_service: ServiceHealthOut
    agent_service: ServiceHealthOut
    authentication: ServiceHealthOut
    storage: ServiceHealthOut
    overall_status: str
