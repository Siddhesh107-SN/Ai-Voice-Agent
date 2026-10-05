"""Sarvam webhook: signature verification, idempotency, and event processing."""
from sqlalchemy import select

from app.models.appointment import Appointment
from app.models.call import Call
from app.models.customer import Customer
from app.models.enums import AppointmentStatus, CallStatus
from app.models.webhook_event import WebhookEvent
from tests.helpers import (auth_headers, create_agent, make_appointment, make_customer,
                           register_ok, send_webhook, webhook_body)


def _tenant_with_agent(client):
    data = register_ok(client, "admin@a.com", "Tenant A")
    token = data["tokens"]["access_token"]
    agent = create_agent(client, token, "Zoya", provider_agent_id="agent-ref-1")
    return {"token": token, "client_id": data["user"]["client_id"], "agent": agent}


# ---------------- signature verification ----------------
def test_missing_signature_rejected(client):
    resp = send_webhook(client, webhook_body(), signature=None)
    assert resp.status_code == 401 and resp.json()["error_code"] == "INVALID_WEBHOOK_SIGNATURE"


def test_wrong_secret_rejected(client):
    resp = send_webhook(client, webhook_body(), secret="not-the-real-secret")
    assert resp.status_code == 401


def test_tampered_body_after_signing_rejected(client):
    import hashlib
    import hmac
    import json

    body = webhook_body()
    raw = json.dumps(body).encode()
    sig = hmac.new(b"test-sarvam-webhook-secret", raw, hashlib.sha256).hexdigest()
    tampered = json.dumps({**body, "agent_id": "someone-elses-agent"}).encode()
    resp = client.post("/api/v1/webhooks/sarvam", content=tampered,
                       headers={"X-Sarvam-Signature": sig, "Content-Type": "application/json"})
    assert resp.status_code == 401


def test_malformed_json_returns_400_not_500(client):
    import hashlib
    import hmac

    raw = b"{not valid json"
    sig = hmac.new(b"test-sarvam-webhook-secret", raw, hashlib.sha256).hexdigest()
    resp = client.post("/api/v1/webhooks/sarvam", content=raw,
                       headers={"X-Sarvam-Signature": sig, "Content-Type": "application/json"})
    assert resp.status_code == 400 and resp.json()["error_code"] == "INVALID_WEBHOOK_PAYLOAD"


def test_missing_required_event_data_returns_400(client):
    resp = send_webhook(client, webhook_body(event_type="call_started", call=None))
    assert resp.status_code == 400


def test_webhook_needs_no_jwt(client):
    """Confirms the endpoint really is signature-authenticated, not JWT-authenticated."""
    resp = send_webhook(client, webhook_body())
    assert resp.status_code != 401 or resp.json()["error_code"] != "NOT_AUTHENTICATED"


# ---------------- idempotency ----------------
def test_duplicate_event_id_is_not_reprocessed(client, db):
    tenant = _tenant_with_agent(client)
    body = webhook_body(agent_id=tenant["agent"]["provider_agent_id"], call={
        "provider_call_id": "call-1", "phone_number": "+919876543210", "direction": "inbound"})
    first = send_webhook(client, body)
    second = send_webhook(client, body)
    assert first.json()["data"]["status"] == "processed"
    assert second.json()["data"]["status"] == "duplicate"
    assert db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == "evt-1")) is not None
    assert len(db.scalars(select(Call)).all()) == 1


def test_unknown_agent_is_recorded_as_failed_not_500(client, db):
    resp = send_webhook(client, webhook_body(agent_id="no-such-agent", call={
        "provider_call_id": "call-x", "phone_number": "+919876543210", "direction": "inbound"}))
    assert resp.status_code == 200 and resp.json()["data"]["status"] == "failed"
    event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == "evt-1"))
    assert event.status.value == "failed" and "no-such-agent" in event.error_message


# ---------------- call_started / call_completed ----------------
def test_call_started_creates_call_linked_to_agent_and_tenant(client, db):
    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(agent_id=tenant["agent"]["provider_agent_id"], call={
        "provider_call_id": "call-1", "phone_number": "+91 98765 43210", "direction": "inbound",
        "status": "in_progress"}))
    assert resp.json()["data"]["status"] == "processed"
    call = db.scalar(select(Call).where(Call.provider_call_id == "call-1"))
    assert call.client_id == tenant["client_id"] and call.agent_id == tenant["agent"]["id"]
    assert call.phone_number == "+919876543210" and call.status == CallStatus.IN_PROGRESS


def test_call_started_links_existing_customer_by_phone(client, db):
    tenant = _tenant_with_agent(client)
    cust = make_customer(client, tenant["token"], "Asha", "+919876543210")
    send_webhook(client, webhook_body(agent_id=tenant["agent"]["provider_agent_id"], call={
        "provider_call_id": "call-2", "phone_number": "+919876543210", "direction": "inbound"}))
    call = db.scalar(select(Call).where(Call.provider_call_id == "call-2"))
    assert call.customer_id == cust["id"]


def test_call_completed_updates_existing_call(client, db):
    tenant = _tenant_with_agent(client)
    ref = tenant["agent"]["provider_agent_id"]
    send_webhook(client, webhook_body(event_id="evt-1", agent_id=ref, call={
        "provider_call_id": "call-3", "phone_number": "+919876543210", "direction": "inbound"}))
    resp = send_webhook(client, webhook_body(event_id="evt-2", event_type="call_completed", agent_id=ref, call={
        "provider_call_id": "call-3", "phone_number": "+919876543210", "direction": "inbound",
        "status": "completed", "duration": 120, "recording_url": "https://rec/3",
        "transcript": "hello there"}))
    assert resp.json()["data"]["status"] == "processed"
    call = db.scalar(select(Call).where(Call.provider_call_id == "call-3"))
    assert call.status == CallStatus.COMPLETED and call.duration == 120
    assert call.recording_url == "https://rec/3" and call.transcript == "hello there"


def test_call_completed_without_prior_started_creates_the_call(client, db):
    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(event_type="call_completed",
                                             agent_id=tenant["agent"]["provider_agent_id"], call={
        "provider_call_id": "call-4", "phone_number": "+919876543210", "direction": "outbound",
        "status": "failed"}))
    assert resp.json()["data"]["status"] == "processed"
    call = db.scalar(select(Call).where(Call.provider_call_id == "call-4"))
    assert call.status == CallStatus.FAILED and call.client_id == tenant["client_id"]


# ---------------- appointment_created ----------------
def test_appointment_created_creates_new_customer_and_appointment(client, db):
    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(event_type="appointment_created",
                                             agent_id=tenant["agent"]["provider_agent_id"],
                                             appointment={
        "customer_phone": "+91 90000 00001", "customer_name": "New Caller",
        "appointment_date": "2030-04-01", "appointment_time": "11:00"}))
    assert resp.json()["data"]["status"] == "processed"
    customer = db.scalar(select(Customer).where(Customer.phone == "+919000000001"))
    assert customer is not None and customer.name == "New Caller"
    appt = db.scalar(select(Appointment).where(Appointment.customer_id == customer.id))
    assert appt.client_id == tenant["client_id"] and str(appt.appointment_date) == "2030-04-01"


def test_appointment_created_reuses_existing_customer(client, db):
    tenant = _tenant_with_agent(client)
    cust = make_customer(client, tenant["token"], "Asha", "+919876543210")
    send_webhook(client, webhook_body(event_type="appointment_created",
                                      agent_id=tenant["agent"]["provider_agent_id"], appointment={
        "customer_phone": "+919876543210", "appointment_date": "2030-04-02",
        "appointment_time": "12:00"}))
    assert db.scalar(select(Customer).where(Customer.phone == "+919876543210")).id == cust["id"]
    appt = db.scalar(select(Appointment).where(Appointment.customer_id == cust["id"]))
    assert appt is not None


def test_appointment_created_double_booking_recorded_as_failed(client, db):
    tenant = _tenant_with_agent(client)
    make_customer(client, tenant["token"], "Asha", "+919876543210")
    body = webhook_body(event_type="appointment_created", agent_id=tenant["agent"]["provider_agent_id"],
                        appointment={"customer_phone": "+919876543210",
                                    "appointment_date": "2030-04-03", "appointment_time": "12:00"})
    first = send_webhook(client, {**body, "event_id": "evt-a"})
    second = send_webhook(client, {**body, "event_id": "evt-b"})
    assert first.json()["data"]["status"] == "processed"
    assert second.json()["data"]["status"] == "failed"
    assert len(db.scalars(select(Appointment)).all()) == 1


# ---------------- appointment_cancelled / rescheduled ----------------
def test_appointment_cancelled_via_webhook(client, db):
    tenant = _tenant_with_agent(client)
    cust = make_customer(client, tenant["token"], "Asha", "+919876543210")
    appt = make_appointment(client, tenant["token"], cust["id"], "2030-01-15", "10:00")
    resp = send_webhook(client, webhook_body(event_type="appointment_cancelled",
                                             agent_id=tenant["agent"]["provider_agent_id"], appointment={
        "customer_phone": "+919876543210", "appointment_id": appt["id"], "reason": "plans changed"}))
    assert resp.json()["data"]["status"] == "processed"
    assert db.get(Appointment, appt["id"]).status == AppointmentStatus.CANCELLED


def test_appointment_rescheduled_via_webhook(client, db):
    tenant = _tenant_with_agent(client)
    cust = make_customer(client, tenant["token"], "Asha", "+919876543210")
    appt = make_appointment(client, tenant["token"], cust["id"], "2030-01-15", "10:00")
    resp = send_webhook(client, webhook_body(event_type="appointment_rescheduled",
                                             agent_id=tenant["agent"]["provider_agent_id"], appointment={
        "customer_phone": "+919876543210", "appointment_id": appt["id"],
        "new_date": "2030-02-01", "new_time": "15:00"}))
    assert resp.json()["data"]["status"] == "processed"
    updated = db.get(Appointment, appt["id"])
    assert str(updated.appointment_date) == "2030-02-01" and updated.status == AppointmentStatus.RESCHEDULED


def test_cancel_with_wrong_phone_is_refused_and_recorded_as_failed(client, db):
    """The agent is NOT trusted to name arbitrary records: phone must match the appointment."""
    tenant = _tenant_with_agent(client)
    cust = make_customer(client, tenant["token"], "Asha", "+919876543210")
    other = make_customer(client, tenant["token"], "Bala", "+919000000009")
    appt = make_appointment(client, tenant["token"], cust["id"])
    resp = send_webhook(client, webhook_body(event_type="appointment_cancelled",
                                             agent_id=tenant["agent"]["provider_agent_id"], appointment={
        "customer_phone": other["phone"], "appointment_id": appt["id"]}))
    assert resp.json()["data"]["status"] == "failed"
    assert db.get(Appointment, appt["id"]).status == AppointmentStatus.SCHEDULED


def test_reschedule_missing_new_slot_returns_400(client):
    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(event_type="appointment_rescheduled",
                                             agent_id=tenant["agent"]["provider_agent_id"],
                                             appointment={"customer_phone": "+919876543210",
                                                         "appointment_id": 1}))
    assert resp.status_code == 400


def test_appointment_cancelled_missing_appointment_data_returns_400(client):
    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(event_type="appointment_cancelled",
                                             agent_id=tenant["agent"]["provider_agent_id"],
                                             appointment=None))
    assert resp.status_code == 400


def test_appointment_created_missing_date_recorded_as_failed(client, db):
    from sqlalchemy import select
    from app.models.webhook_event import WebhookEvent

    tenant = _tenant_with_agent(client)
    resp = send_webhook(client, webhook_body(event_type="appointment_created",
                                             agent_id=tenant["agent"]["provider_agent_id"],
                                             appointment={"customer_phone": "+919876543210"}))
    assert resp.json()["data"]["status"] == "failed"
    event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == "evt-1"))
    assert event.error_message == "appointment_date and appointment_time are required"


def test_call_started_redelivered_with_new_event_id_is_not_duplicated(client, db):
    """Same provider_call_id, but the PROVIDER assigned a new event_id (a real redelivery
    case) — the call itself must still not be duplicated."""
    tenant = _tenant_with_agent(client)
    call_data = {"provider_call_id": "call-redelivered", "phone_number": "+919876543210",
                "direction": "inbound"}
    first = send_webhook(client, webhook_body(event_id="evt-x1",
                                              agent_id=tenant["agent"]["provider_agent_id"],
                                              call=call_data))
    second = send_webhook(client, webhook_body(event_id="evt-x2",
                                               agent_id=tenant["agent"]["provider_agent_id"],
                                               call=call_data))
    assert first.json()["data"]["status"] == "processed"
    assert second.json()["data"]["status"] == "processed"  # a new event, just a no-op call insert
    assert len(db.scalars(select(Call)).all()) == 1
