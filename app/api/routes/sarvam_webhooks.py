import logging
import secrets
from time import perf_counter
from typing import Callable, TypeVar

from fastapi import APIRouter, BackgroundTasks, Depends, Path, Request

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.dependencies import DbSession
from app.core.exceptions import NotFoundError, UnprocessableError
from app.integrations.sarvam.schemas import SarvamAppointmentRequest, SarvamOutboundPayload
from app.models.client import Client
from app.schemas.appointment import AppointmentOut
from app.schemas.common import ApiResponse
from app.services.agent_request_service import AgentRequestService
from app.services.sarvam_service import process_sarvam_outbound
from app.services.tool_call_log_service import (
    log_invalid_tool_token, record_tool_call, safe_request_id,
)

logger = logging.getLogger(__name__)
router = APIRouter()
T = TypeVar("T")


def verify_sarvam_token(request: Request, token: str = Path(...)) -> None:
    secret = get_settings().sarvam_webhook_secret
    if not secret or not secrets.compare_digest(token.encode(), secret.encode()):
        log_invalid_tool_token(
            "invalid_or_unconfigured_token",
            request_id=safe_request_id(request, token),
        )
        raise NotFoundError("Not found")
    request.state.sarvam_tool_token_valid = True


def _safe_record_tool_call(**fields) -> None:
    try:
        record_tool_call(**fields)
    except Exception:
        logger.exception("Could not audit Sarvam tool call")


def _logged_tool_call(request: Request, db: DbSession, client_id: int, tool: str,
                      operation: Callable[[], T], token: str,
                      appointment_id: int | None = None) -> T:
    started = perf_counter()
    try:
        if db.get(Client, client_id) is None:
            raise RuntimeError("Internal server error")
        result = operation()
    except Exception as exc:
        _safe_record_tool_call(
            client_id=client_id, tool=tool, success=False,
            error_code=getattr(exc, "error_code", "INTERNAL_ERROR"),
            message=getattr(exc, "message", "Tool request failed"),
            appointment_id=appointment_id,
            duration_ms=round((perf_counter() - started) * 1000),
            request_id=safe_request_id(request, token),
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
    )
    return result


def _process_outbound(payload: SarvamOutboundPayload) -> None:
    try:
        with SessionLocal() as db:
            process_sarvam_outbound(db, payload)
    except Exception:
        logger.exception("Unexpected Sarvam outbound webhook processing error")


@router.post("/sarvam/{token}/outbound", dependencies=[Depends(verify_sarvam_token)])
def outbound(token: str, payload: SarvamOutboundPayload, background_tasks: BackgroundTasks):
    background_tasks.add_task(_process_outbound, payload)
    return {"ok": True}


def _require_date_time(body: SarvamAppointmentRequest) -> tuple:
    if body.appointment_date is None or body.appointment_time is None:
        raise UnprocessableError(
            "appointment_date and appointment_time are required",
            error_code="APPOINTMENT_DATE_REQUIRED",
        )
    return body.appointment_date, body.appointment_time


@router.post("/sarvam/{token}/{client_id}/appointments/check-slot",
             response_model=ApiResponse[dict], dependencies=[Depends(verify_sarvam_token)])
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
             dependencies=[Depends(verify_sarvam_token)])
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
             dependencies=[Depends(verify_sarvam_token)])
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
             dependencies=[Depends(verify_sarvam_token)])
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
