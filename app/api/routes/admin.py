from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query, Request

from app.core.dependencies import DbSession, SuperAdminUser
from app.core.rate_limit import limiter
from app.schemas.admin import (AccessActionResponse, AccessDeclineRequest,
                               AccessRequestItem, AdminAgentItem,
                               AdminBusinessItem, AdminMessageItem,
                               AdminMessageUpdateRequest, AgentPowerRequest,
                               BusinessMinutePackRequest,
                               BusinessStatusUpdateRequest, LogItem,
                               PinResetRequest, PinResetResponse,
                               PinViewResponse)
from app.services.admin_service import AdminService

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ---------------- 1. ACCESS REQUESTS ----------------

@router.get("/access-requests", response_model=list[AccessRequestItem])
def list_access_requests(user: SuperAdminUser, db: DbSession):
    """Retrieve all pending, needs review, or recently decided access requests."""
    return AdminService(db).get_access_requests()


@router.post("/access/{client_id}/approve", response_model=AccessActionResponse)
def approve_client_access(client_id: int, request: Request, user: SuperAdminUser, db: DbSession):
    """Approve client payment, activate subscription, and dispatch welcome email."""
    return AdminService(db).approve_access(client_id=client_id, user=user, ip=_ip(request))


@router.post("/access/{client_id}/decline", response_model=AccessActionResponse)
def decline_client_access(
    client_id: int, body: AccessDeclineRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Decline client payment, store rejection reason, and dispatch notification email."""
    return AdminService(db).decline_access(client_id=client_id, reason=body.reason, user=user, ip=_ip(request))


# ---------------- 2. BUSINESSES ----------------

@router.get("/businesses", response_model=list[AdminBusinessItem])
def list_businesses(user: SuperAdminUser, db: DbSession):
    """List all registered platform businesses with subscription, usage, and login metrics."""
    return AdminService(db).get_businesses()


@router.patch("/businesses/{client_id}/status")
def update_business_status(
    client_id: int, body: BusinessStatusUpdateRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Set business status to Active or Suspended across all client accounts."""
    return AdminService(db).update_business_status(client_id=client_id, status_str=body.status, user=user, ip=_ip(request))


@router.post("/businesses/{client_id}/minute-pack")
def add_minute_pack(
    client_id: int, body: BusinessMinutePackRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Add bonus/purchased minutes (1 to 10000) to a business."""
    return AdminService(db).add_minute_pack(client_id=client_id, minutes=body.minutes, user=user, ip=_ip(request))


@router.post("/businesses/{client_id}/pin-view", response_model=PinViewResponse)
@limiter.limit("10/minute")
def view_business_pin(client_id: int, request: Request, user: SuperAdminUser, db: DbSession):
    """Decrypt and view current staff PIN (audit-logged, rate-limited to 10/min)."""
    return AdminService(db).view_pin(client_id=client_id, user=user, ip=_ip(request))


@router.post("/businesses/{client_id}/pin-reset", response_model=PinResetResponse)
def reset_business_pin(
    client_id: int, body: PinResetRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Reset staff PIN to provided or generated 4 digits and clear lockout attempts."""
    return AdminService(db).reset_pin(client_id=client_id, pin=body.pin, user=user, ip=_ip(request))


# ---------------- 3. AGENTS ----------------

@router.get("/agents", response_model=list[AdminAgentItem])
def list_all_agents(user: SuperAdminUser, db: DbSession):
    """Retrieve all agents across all tenants with call metrics."""
    return AdminService(db).get_agents()


@router.patch("/agents/{agent_id}/power")
def toggle_agent_power(
    agent_id: int, body: AgentPowerRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Toggle agent online/offline status platform-wide."""
    return AdminService(db).toggle_agent_power(agent_id=agent_id, online=body.online, user=user, ip=_ip(request))


# ---------------- 4. AUDIT LOGS ----------------

@router.get("/logs", response_model=list[LogItem])
def list_logs(
    user: SuperAdminUser,
    db: DbSession,
    level: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    before: Annotated[datetime | None, Query()] = None,
):
    """Retrieve filtered audit logs with human-readable timestamps and levels."""
    return AdminService(db).get_logs(level=level, limit=limit, before=before)


# ---------------- 5. MESSAGES & SCREENSHOT ----------------

@router.get("/messages", response_model=list[AdminMessageItem])
def list_messages(user: SuperAdminUser, db: DbSession):
    """List contact form inquiries and platform messages."""
    return AdminService(db).get_messages()


@router.patch("/messages/{message_id}", response_model=AdminMessageItem)
def update_message_status(
    message_id: int, body: AdminMessageUpdateRequest, request: Request, user: SuperAdminUser, db: DbSession
):
    """Update read or handled status for a contact message."""
    return AdminService(db).update_message(
        message_id=message_id, read=body.read, handled=body.handled, user=user, ip=_ip(request)
    )


@router.get("/payments/{payment_id}/screenshot")
def stream_payment_screenshot(payment_id: int, user: SuperAdminUser, db: DbSession):
    """Stream securely stored payment screenshot receipt for super_admin review."""
    return AdminService(db).get_screenshot_response(payment_id=payment_id)
