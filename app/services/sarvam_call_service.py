"""Handle Sarvam call-completed callbacks and call-start service gating."""
from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.integrations.sarvam.schemas import SarvamCallCompletedPayload
from app.models.agent import Agent
from app.models.call import Call
from app.models.client import Client
from app.models.customer import Customer
from app.models.enums import (
    CallDirection,
    CallStatus,
    WebhookEventStatus,
)
from app.models.webhook_event import WebhookEvent
from app.services.billing_service import BillingService, call_start_reason
from app.services.tool_call_log_service import (
    record_call_start_denial,
    record_unlinked_sarvam_call,
    sanitize_payload,
)
from app.utils.validators import normalize_phone

logger = logging.getLogger(__name__)


def _utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _status(payload: SarvamCallCompletedPayload) -> CallStatus:
    completion = (payload.completion_status or "").strip().lower().replace("-", "_")
    connectivity = (payload.connectivity_status or "").strip().lower().replace("-", "_")
    if completion in {"failed", "failure"} or connectivity in {"failed", "failure"}:
        return CallStatus.FAILED
    if completion in {"busy", "no_answer", "not_connected", "unconnected"} or connectivity in {
        "busy", "no_answer", "not_connected", "unconnected",
    }:
        return CallStatus.MISSED
    if payload.duration is not None and payload.duration > 0:
        return CallStatus.COMPLETED
    return CallStatus.MISSED


def _phone(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return normalize_phone(value)
    except ValueError:
        return None


def _agent_for_call(
    db: Session,
    client_id: int,
    payload: SarvamCallCompletedPayload,
    outbound: bool,
) -> Agent | None:
    if payload.app_id:
        agent = db.scalar(
            select(Agent).where(
                Agent.client_id == client_id,
                Agent.provider_agent_id == payload.app_id,
            )
        )
        if agent is not None:
            return agent

    agent_phone = _phone(payload.agent_phone_number)
    if agent_phone is None:
        agent_phone = _phone(payload.from_number if outbound else payload.to_number)
    if agent_phone is None:
        agent_phone = _phone(payload.phone_number)
    if agent_phone is None:
        return None
    return db.scalar(
        select(Agent).where(
            Agent.client_id == client_id,
            Agent.phone_number == agent_phone,
        )
    )


def _transcript(payload: SarvamCallCompletedPayload) -> str | None:
    lines = []
    for item in payload.interaction_transcript or []:
        text = item.en_text or item.indic_text
        if text:
            safe_text = sanitize_payload(text)
            lines.append(f"{item.role or 'speaker'}: {safe_text}")
    return "\n".join(lines) or None


def _duplicate_event(
    db: Session,
    client_id: int,
    event_id: str,
    request_id: str | None,
) -> dict:
    db.rollback()
    event = db.scalar(
        select(WebhookEvent).where(
            WebhookEvent.provider == "sarvam",
            WebhookEvent.event_id == event_id,
            WebhookEvent.client_id == client_id,
        )
    )
    if event is None:
        return {"ok": True, "status": "ignored"}
    event.status = WebhookEventStatus.DUPLICATE
    event.processed_at = datetime.now(timezone.utc)
    if request_id:
        event.request_id = request_id
    db.commit()
    return {"ok": True, "status": "duplicate"}


def process_call_completed(
    db: Session,
    *,
    client_id: int,
    payload: SarvamCallCompletedPayload,
    raw_payload: dict[str, Any],
    request_id: str | None,
) -> dict:
    """Persist a sanitized, idempotent call completion in the authenticated tenant."""
    event_id = payload.interaction_id or payload.attempt_id
    if event_id is None:
        return {"ok": True, "status": "ignored"}

    outbound = payload.attempt_id is not None
    status = _status(payload)
    if outbound:
        phone_number = _phone(
            payload.to_number or payload.phone_number or payload.from_number
        )
    else:
        phone_number = _phone(
            payload.from_number or payload.phone_number or payload.to_number
        )
    if phone_number is None:
        return {"ok": True, "status": "ignored"}

    agent = _agent_for_call(db, client_id, payload, outbound)
    sanitized_payload = sanitize_payload(raw_payload)
    event = WebhookEvent(
        provider="sarvam",
        event_id=event_id,
        event_type="call_completed",
        client_id=client_id,
        payload=sanitized_payload,
        status=WebhookEventStatus.RECEIVED,
        request_id=request_id,
    )
    db.add(event)
    try:
        db.flush()
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint != "uq_webhook_provider_event":
            raise
        return _duplicate_event(db, client_id, event_id, request_id)

    call = None
    if payload.interaction_id:
        call = db.scalar(
            select(Call).where(
                Call.client_id == client_id,
                Call.provider_call_id == payload.interaction_id,
            )
        )
    customer = db.scalar(
        select(Customer).where(
            Customer.client_id == client_id,
            Customer.phone == phone_number,
        )
    )
    duration = (
        math.ceil(payload.duration)
        if status == CallStatus.COMPLETED and payload.duration is not None
        else None
    )
    values = {
        "agent_id": agent.id if agent else None,
        "customer_id": customer.id if customer else None,
        "provider_call_id": payload.interaction_id,
        "phone_number": phone_number,
        "direction": CallDirection.OUTBOUND if outbound else CallDirection.INBOUND,
        "status": status,
        "duration": duration,
        "transcript": _transcript(payload),
        "started_at": _utc_datetime(payload.start_time),
        "ended_at": _utc_datetime(payload.end_time),
    }
    if call is None:
        call = Call(client_id=client_id, **values)
        db.add(call)
    else:
        for field, value in values.items():
            setattr(call, field, value)

    event.status = WebhookEventStatus.PROCESSED
    event.processed_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint != "uq_calls_client_provider_call" or not payload.interaction_id:
            raise
        db.rollback()
        duplicate = db.scalar(
            select(WebhookEvent).where(
                WebhookEvent.provider == "sarvam",
                WebhookEvent.event_id == event_id,
                WebhookEvent.client_id == client_id,
            )
        )
        if duplicate is not None:
            return _duplicate_event(db, client_id, event_id, request_id)
        call = db.scalar(
            select(Call).where(
                Call.client_id == client_id,
                Call.provider_call_id == payload.interaction_id,
            )
        )
        if call is None:
            raise
        for field, value in values.items():
            setattr(call, field, value)
        event = WebhookEvent(
            provider="sarvam",
            event_id=event_id,
            event_type="call_completed",
            client_id=client_id,
            payload=sanitized_payload,
            status=WebhookEventStatus.PROCESSED,
            processed_at=datetime.now(timezone.utc),
            request_id=request_id,
        )
        db.add(event)
        db.commit()

    if agent is None:
        try:
            record_unlinked_sarvam_call(
                client_id=client_id,
                app_id=payload.app_id,
                request_id=request_id,
            )
        except Exception:
            logger.exception("Could not audit Sarvam call with an unlinked agent")
    return {"ok": True, "status": "processed"}


def call_start_status(
    db: Session,
    client_id: int,
    overage_grace_percent: int,
    request_id: str | None,
) -> dict:
    """Return whether a tenant may start a Sarvam call; failures fail open."""
    business_name = ""
    plan = ""
    minutes_remaining = 0
    try:
        client = db.get(Client, client_id)
        if client is None:
            return {
                "service_active": True,
                "reason": "ok",
                "business_name": business_name,
                "plan": plan,
                "minutes_remaining": minutes_remaining,
            }

        business_name = client.business_name
        billing = BillingService(db).get_billing_me(client_id, create_default=False)
        plan = billing["plan"]
        minutes_remaining = billing["minutes_remaining"]

        reason = call_start_reason(client, billing, overage_grace_percent)
        active = reason == "ok"

        if not active:
            try:
                record_call_start_denial(
                    client_id=client_id,
                    reason=reason,
                    request_id=request_id,
                )
            except Exception:
                logger.exception("Could not audit denied Sarvam call start; allowing call")
                active, reason = True, "ok"
        return {
            "service_active": active,
            "reason": reason,
            "business_name": business_name,
            "plan": plan,
            "minutes_remaining": minutes_remaining,
        }
    except Exception:
        logger.exception("Sarvam call-start gate failed; allowing call")
        return {
            "service_active": True,
            "reason": "ok",
            "business_name": business_name,
            "plan": plan,
            "minutes_remaining": minutes_remaining,
        }
