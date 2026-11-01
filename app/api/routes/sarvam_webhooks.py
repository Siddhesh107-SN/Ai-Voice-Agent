import logging
import hmac
import json
import secrets
from time import perf_counter
from typing import Callable, TypeVar

from fastapi import APIRouter, BackgroundTasks, Depends, Header, Path, Request
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.dependencies import DbSession
from app.core.exceptions import AppError, NotFoundError, UnprocessableError
from app.core.rate_limit import limiter
from app.integrations.sarvam.schemas import (
    SarvamAppointmentRequest,
    SarvamCallCompletedPayload,
    SarvamOutboundPayload,
)
from app.models.client import Client
from app.models.client_tool_credential import ClientToolCredential
from app.schemas.appointment import AppointmentOut
from app.schemas.common import ApiResponse
from app.services.agent_request_service import AgentRequestService
from app.services.sarvam_call_service import call_start_status, process_call_completed
from app.services.sarvam_service import process_sarvam_outbound
from app.services.tool_call_log_service import (
    log_invalid_tool_token, log_legacy_shared_token_use, record_tool_call,
    safe_request_id,
)
from app.services.client_tool_credential_service import (
    record_credential_use, token_digest,
)

logger = logging.getLogger(__name__)
router = APIRouter()
T = TypeVar("T")


def verify_sarvam_token(request: Request, token: str = Path(...)) -> None:
    settings = get_settings()
    secret = settings.sarvam_webhook_secret
    if (
        not settings.sarvam_legacy_shared_token_enabled
        or not secret
        or not secrets.compare_digest(token.encode(), secret.encode())
    ):
        log_invalid_tool_token(
            "invalid_or_unconfigured_token",
            request_id=safe_request_id(request, token),
        )
        raise NotFoundError("Not found")
    request.state.sarvam_tool_token_valid = True


def verify_client_sarvam_token(
    request: Request,
    db: DbSession,
    token: str = Path(...),
    client_id: int = Path(...),
) -> None:
    _verify_client_token(request, db, client_id, token, allow_legacy=True)


def _verify_client_token(
    request: Request,
    db: DbSession,
    client_id: int,
    token: str,
    *,
    allow_legacy: bool,
) -> None:
    credential = db.scalar(
        select(ClientToolCredential).where(
            ClientToolCredential.client_id == client_id,
            ClientToolCredential.revoked_at.is_(None),
        )
    )
    if credential and hmac.compare_digest(
        credential.token_hash, token_digest(token)
    ):
        request.state.sarvam_tool_token_valid = True
        request.state.sarvam_tool_credential_id = credential.id
        request.state.sarvam_tool_auth_token = token
        record_credential_use(credential.id)
        return

    settings = get_settings()
    legacy = settings.sarvam_webhook_secret
    if (
        allow_legacy
        and settings.sarvam_legacy_shared_token_enabled
        and legacy
        and hmac.compare_digest(token.encode("utf-8"), legacy.encode("utf-8"))
    ):
        request.state.sarvam_tool_token_valid = True
        request.state.sarvam_legacy_shared_token_used = True
        request.state.sarvam_tool_auth_token = token
        request_id = safe_request_id(request, token)
        log_legacy_shared_token_use(client_id, request_id)
        return

    log_invalid_tool_token(
        "invalid_or_unconfigured_token",
        request_id=safe_request_id(request, token),
    )
    raise NotFoundError("Not found")


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, separator, credentials = authorization.partition(" ")
    if separator and scheme.lower() == "bearer" and credentials.strip():
        return credentials.strip()
    return None


def verify_client_sarvam_header_token(
    request: Request,
    db: DbSession,
    client_id: int = Path(...),
    x_tool_token: str | None = Header(default=None, alias="X-Tool-Token"),
    authorization: str | None = Header(default=None),
) -> str:
    token = x_tool_token or _bearer_token(authorization)
    if not token:
        log_invalid_tool_token(
            "missing_or_invalid_header_token",
            request_id=safe_request_id(request),
        )
        raise NotFoundError("Not found")
    _verify_client_token(request, db, client_id, token, allow_legacy=False)
    return token


def verify_client_sarvam_webhook_token(
    request: Request,
    db: DbSession,
    token: str = Path(...),
    client_id: int = Path(...),
) -> None:
    _verify_client_token(request, db, client_id, token, allow_legacy=False)


def verify_client_sarvam_webhook_header(
    request: Request,
    db: DbSession,
    client_id: int = Path(...),
    x_webhook_token: str | None = Header(default=None, alias="X-Webhook-Token"),
    authorization: str | None = Header(default=None),
) -> str:
    token = x_webhook_token or _bearer_token(authorization)
    if not token:
        log_invalid_tool_token(
            "missing_or_invalid_webhook_header_token",
            request_id=safe_request_id(request),
        )
        raise NotFoundError("Not found")
    _verify_client_token(request, db, client_id, token, allow_legacy=False)
    return token


def verify_client_sarvam_call_start_token(
    request: Request,
    db: DbSession,
    client_id: int = Path(...),
    x_tool_token: str | None = Header(default=None, alias="X-Tool-Token"),
    authorization: str | None = Header(default=None),
) -> str:
    return verify_client_sarvam_header_token(
        request, db, client_id, x_tool_token, authorization
    )


def _safe_record_tool_call(**fields) -> None:
    try:
        record_tool_call(**fields)
    except Exception:
        logger.exception("Could not audit Sarvam tool call")


def _reject_json_constant(value: str):
    raise ValueError(f"Invalid JSON number: {value}")


async def _handle_call_completed(
    request: Request,
    db: Session,
    client_id: int,
    token: str,
) -> dict:
    try:
        raw_payload = json.loads(
            await request.body(),
            parse_constant=_reject_json_constant,
        )
    except (UnicodeDecodeError, ValueError):
        return {"ok": True, "status": "ignored"}
    if not isinstance(raw_payload, dict):
        return {"ok": True, "status": "ignored"}
    try:
        payload = SarvamCallCompletedPayload.model_validate(raw_payload)
    except ValidationError:
        return {"ok": True, "status": "ignored"}
    return process_call_completed(
        db,
        client_id=client_id,
        payload=payload,
        raw_payload=raw_payload,
        request_id=safe_request_id(request, token),
    )


def _logged_tool_call(request: Request, db: DbSession, client_id: int, tool: str,
                      operation: Callable[[], T], token: str,
                      appointment_id: int | None = None) -> T:
    started = perf_counter()
    legacy_shared_token_used = getattr(
        request.state, "sarvam_legacy_shared_token_used", False
    )
    try:
        if db.get(Client, client_id) is None:
            raise NotFoundError("Not found")
        result = operation()
    except AppError as exc:
        _safe_record_tool_call(
            client_id=client_id, tool=tool, success=False,
            error_code=exc.error_code, message=exc.message,
            appointment_id=appointment_id,
            duration_ms=round((perf_counter() - started) * 1000),
            request_id=safe_request_id(request, token),
            legacy_shared_token_used=legacy_shared_token_used,
        )
        raise
    except Exception as exc:
        logger.exception("Unexpected Sarvam tool operation failure")
        _safe_record_tool_call(
            client_id=client_id, tool=tool, success=False,
            error_code=getattr(exc, "error_code", "INTERNAL_ERROR"),
            message=getattr(exc, "message", "Tool request failed"),
            appointment_id=appointment_id,
            duration_ms=round((perf_counter() - started) * 1000),
            request_id=safe_request_id(request, token),
            legacy_shared_token_used=legacy_shared_token_used,
        )
        raise

    data = getattr(result, "data", None)
    if appointment_id is None:
        appointment_id = getattr(data, "id", None)
    _safe_record_tool_call(
        client_id=client_id, tool=tool, success=True, error_code=None, message=None,
        appointment_id=appointment_id,
        duration_ms=round((perf_counter() - started) * 1000),
        request_id=safe_request_id(request, token),
        legacy_shared_token_used=legacy_shared_token_used,
    )
    return result


def _process_outbound(payload: SarvamOutboundPayload) -> None:
    try:
        with SessionLocal() as db:
            process_sarvam_outbound(db, payload)
    except Exception:
        logger.exception("Unexpected Sarvam outbound webhook processing error")


@router.post("/sarvam/{token}/outbound", dependencies=[Depends(verify_sarvam_token)])
@limiter.limit("30/minute")
def outbound(request: Request, token: str, payload: SarvamOutboundPayload, background_tasks: BackgroundTasks):
    background_tasks.add_task(_process_outbound, payload)
    return {"ok": True}


@router.post(
    "/sarvam/{token}/{client_id}/call-completed",
    dependencies=[Depends(verify_client_sarvam_webhook_token)],
)
@limiter.limit("30/minute")
async def call_completed(request: Request, token: str, client_id: int, db: DbSession):
    return await _handle_call_completed(request, db, client_id, token)


@router.post("/sarvam/{client_id}/call-completed")
@limiter.limit("30/minute")
async def call_completed_header(
    request: Request,
    client_id: int,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_webhook_header),
):
    return await _handle_call_completed(request, db, client_id, token)


@router.post("/sarvam/{client_id}/call-start")
@limiter.limit("30/minute")
def call_start(
    request: Request,
    client_id: int,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_call_start_token),
):
    settings = get_settings()
    return call_start_status(
        db,
        client_id,
        settings.overage_grace_percent,
        safe_request_id(request, token),
    )


def _require_date_time(body: SarvamAppointmentRequest) -> tuple:
    if body.appointment_date is None or body.appointment_time is None:
        raise UnprocessableError(
            "appointment_date and appointment_time are required",
            error_code="APPOINTMENT_DATE_REQUIRED",
        )
    return body.appointment_date, body.appointment_time


@router.post("/sarvam/{token}/{client_id}/appointments/check-slot",
             response_model=ApiResponse[dict], dependencies=[Depends(verify_client_sarvam_token)])
@limiter.limit("60/minute")
def check_slot(request: Request, token: str, client_id: int,
               body: SarvamAppointmentRequest, db: DbSession):
    def operation():
        appointment_date, appointment_time = _require_date_time(body)
        available = AgentRequestService(db, client_id).check_slot(
            customer_phone=body.customer_phone,
            appointment_date=appointment_date,
            appointment_time=appointment_time)
        return ApiResponse(message="Slot availability checked",
                           data={"available": available})

    return _logged_tool_call(request, db, client_id, "check_slot", operation, token)


@router.post("/sarvam/{token}/{client_id}/appointments/book",
             response_model=ApiResponse[AppointmentOut],
             dependencies=[Depends(verify_client_sarvam_token)])
@limiter.limit("60/minute")
def book(request: Request, token: str, client_id: int,
         body: SarvamAppointmentRequest, db: DbSession):
    def operation():
        appointment_date, appointment_time = _require_date_time(body)
        appointment = AgentRequestService(db, client_id).book(
            customer_phone=body.customer_phone, customer_name=body.customer_name,
            appointment_date=appointment_date, appointment_time=appointment_time,
            notes=body.notes)
        return ApiResponse(message="Appointment booked successfully",
                           data=AppointmentOut.model_validate(appointment))

    return _logged_tool_call(request, db, client_id, "book", operation, token)


@router.post("/sarvam/{token}/{client_id}/appointments/reschedule",
             response_model=ApiResponse[AppointmentOut],
             dependencies=[Depends(verify_client_sarvam_token)])
@limiter.limit("60/minute")
def reschedule(request: Request, token: str, client_id: int,
               body: SarvamAppointmentRequest, db: DbSession):
    def operation():
        if body.new_date is None or body.new_time is None:
            raise UnprocessableError("new_date and new_time are required",
                                     error_code="RESCHEDULE_DATE_REQUIRED")
        appointment = AgentRequestService(db, client_id).reschedule(
            customer_phone=body.customer_phone, appointment_id=body.appointment_id,
            day=body.appointment_date, at=body.appointment_time,
            new_date=body.new_date, new_time=body.new_time, reason=body.reason)
        return ApiResponse(message="Appointment rescheduled successfully",
                           data=AppointmentOut.model_validate(appointment))

    return _logged_tool_call(request, db, client_id, "reschedule", operation,
                             token,
                             appointment_id=body.appointment_id)


@router.post("/sarvam/{token}/{client_id}/appointments/cancel",
             response_model=ApiResponse[AppointmentOut],
             dependencies=[Depends(verify_client_sarvam_token)])
@limiter.limit("60/minute")
def cancel(request: Request, token: str, client_id: int,
           body: SarvamAppointmentRequest, db: DbSession):
    def operation():
        appointment = AgentRequestService(db, client_id).cancel(
            customer_phone=body.customer_phone, appointment_id=body.appointment_id,
            day=body.appointment_date, at=body.appointment_time, reason=body.reason)
        return ApiResponse(message="Appointment cancelled successfully",
                           data=AppointmentOut.model_validate(appointment))

    return _logged_tool_call(request, db, client_id, "cancel", operation,
                             token,
                             appointment_id=body.appointment_id)


@router.post("/sarvam/{client_id}/appointments/check-slot",
             response_model=ApiResponse[dict])
def check_slot_header(
    request: Request,
    client_id: int,
    body: SarvamAppointmentRequest,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_header_token),
):
    return check_slot(request, token, client_id, body, db)


@router.post("/sarvam/{client_id}/appointments/book",
             response_model=ApiResponse[AppointmentOut])
def book_header(
    request: Request,
    client_id: int,
    body: SarvamAppointmentRequest,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_header_token),
):
    return book(request, token, client_id, body, db)


@router.post("/sarvam/{client_id}/appointments/reschedule",
             response_model=ApiResponse[AppointmentOut])
def reschedule_header(
    request: Request,
    client_id: int,
    body: SarvamAppointmentRequest,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_header_token),
):
    return reschedule(request, token, client_id, body, db)


@router.post("/sarvam/{client_id}/appointments/cancel",
             response_model=ApiResponse[AppointmentOut])
def cancel_header(
    request: Request,
    client_id: int,
    body: SarvamAppointmentRequest,
    db: DbSession,
    token: str = Depends(verify_client_sarvam_header_token),
):
    return cancel(request, token, client_id, body, db)
