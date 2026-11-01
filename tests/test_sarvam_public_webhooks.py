from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.audit_log import AuditLog
from app.models.call_attempt import CallAttempt
from app.models.enums import AppointmentStatus
from tests.helpers import (
    make_appointment,
    make_customer,
    register_ok,
    super_admin_headers,
)


SECRET = "test-sarvam-webhook-secret"


def _tenant(client, email="admin@example.com"):
    data = register_ok(client, email)
    return data["tokens"]["access_token"], data["user"]["client_id"]


def _url(client_id, action, token=SECRET):
    return f"/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/{action}"


def test_public_sarvam_routes_reject_wrong_token(client):
    response = client.post("/api/v1/webhooks/sarvam/wrong/outbound",
                           json={"attempt_id": "attempt-1", "status": "connected"})
    assert response.status_code == 404


def test_outbound_rejects_shared_token_when_legacy_compatibility_is_disabled(
    client, monkeypatch
):
    monkeypatch.setattr(
        get_settings(), "sarvam_legacy_shared_token_enabled", False
    )
    response = client.post(
        f"/api/v1/webhooks/sarvam/{SECRET}/outbound",
        json={"attempt_id": "attempt-disabled", "status": "connected"},
    )
    assert response.status_code == 404


def test_header_authenticated_tool_routes_use_per_client_token_only(client, db):
    _, client_id = _tenant(client, "header-tool@example.com")
    root = super_admin_headers(client)
    created = client.post(
        f"/api/v1/admin/clients/{client_id}/tool-token",
        headers=root,
    )
    assert created.status_code == 200
    tool_token = created.json()["data"]["token"]
    body = {
        "customer_phone": "+919876543210",
        "appointment_date": "2032-05-01",
        "appointment_time": "10:00",
    }

    custom_header = client.post(
        f"/api/v1/webhooks/sarvam/{client_id}/appointments/check-slot",
        headers={"X-Tool-Token": tool_token},
        json=body,
    )
    bearer = client.post(
        f"/api/v1/webhooks/sarvam/{client_id}/appointments/check-slot",
        headers={"Authorization": f"Bearer {tool_token}"},
        json=body,
    )
    assert custom_header.status_code == bearer.status_code == 200
    assert custom_header.json()["data"]["available"] is True
    assert bearer.json()["data"]["available"] is True

    invalid_body = client.post(
        f"/api/v1/webhooks/sarvam/{client_id}/appointments/check-slot",
        headers={"X-Tool-Token": tool_token},
        json={"appointment_date": "2032-05-01", "appointment_time": "10:00"},
    )
    assert invalid_body.status_code == 422
    validation_logs = db.scalars(
        select(AuditLog).where(
            AuditLog.client_id == client_id,
            AuditLog.action == "sarvam_tool.check_slot",
        )
    ).all()
    validation_log = next(
        (row for row in validation_logs
         if row.details.get("error_code") == "VALIDATION_ERROR"),
        None,
    )
    assert validation_log is not None
    assert tool_token not in str(validation_log.details)

    audit_count = db.scalar(select(func.count(AuditLog.id)))
    wrong_tenant = client.post(
        f"/api/v1/webhooks/sarvam/{client_id + 1}/appointments/check-slot",
        headers={"X-Tool-Token": tool_token},
        json=body,
    )
    legacy = client.post(
        f"/api/v1/webhooks/sarvam/{client_id}/appointments/check-slot",
        headers={"X-Tool-Token": SECRET},
        json=body,
    )
    assert wrong_tenant.status_code == legacy.status_code == 404
    assert db.scalar(select(func.count(AuditLog.id))) == audit_count


def test_outbound_connected_is_idempotent(client, db):
    _, client_id = _tenant(client, "admin@sarvam-example.com")
    body = {
        "attempt_id": "attempt-1",
        "status": "connected",
        "duration": 12,
        "interaction_id": "interaction-1",
        "final_agent_variables": {"booked": True},
        "interaction_transcript": [{"role": "agent", "en_text": "Hello"}],
        "webhook_config": {"metadata": {"client_id": client_id}},
    }
    first = client.post(f"/api/v1/webhooks/sarvam/{SECRET}/outbound", json=body)
    second = client.post(f"/api/v1/webhooks/sarvam/{SECRET}/outbound", json=body)
    assert first.json() == {"ok": True}
    assert second.json() == {"ok": True}
    attempts = db.scalars(select(CallAttempt).where(CallAttempt.attempt_id == "attempt-1")).all()
    assert len(attempts) == 1
    assert attempts[0].client_id == client_id


def test_public_sarvam_appointment_operations_are_tenant_scoped(client):
    token_a, client_a = _tenant(client, "a@sarvam-example.com")
    token_b, client_b = _tenant(client, "b@sarvam-example.com")
    customer_a = make_customer(client, token_a, "A", "+919876543201")
    customer_b = make_customer(client, token_b, "B", "+919876543202")
    appointment_b = make_appointment(client, token_b, customer_b["id"])

    body = {
        "customer_phone": customer_a["phone"],
        "appointment_date": "2030-01-15",
        "appointment_time": "10:00",
    }
    check = client.post(_url(client_a, "check-slot"), json=body)
    assert check.status_code == 200 and check.json()["data"]["available"] is True

    booked = client.post(_url(client_a, "book"), json=body)
    assert booked.status_code == 200
    appointment_a = booked.json()["data"]

    foreign_cancel = client.post(_url(client_a, "cancel"), json={
        "customer_phone": customer_a["phone"], "appointment_id": appointment_b["id"],
        "reason": "not mine"})
    assert foreign_cancel.status_code == 404

    rescheduled = client.post(_url(client_a, "reschedule"), json={
        "customer_phone": customer_a["phone"], "appointment_id": appointment_a["id"],
        "new_date": "2030-01-16", "new_time": "11:00"})
    assert rescheduled.status_code == 200
    cancelled = client.post(_url(client_a, "cancel"), json={
        "customer_phone": customer_a["phone"], "appointment_id": appointment_a["id"]})
    assert cancelled.status_code == 200
    assert cancelled.json()["data"]["status"] == AppointmentStatus.CANCELLED.value
