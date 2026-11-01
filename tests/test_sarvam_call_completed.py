import json

from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.audit_log import AuditLog
from app.models.call import Call
from app.models.enums import CallDirection, CallStatus, WebhookEventStatus
from app.models.webhook_event import WebhookEvent
from app.services.billing_service import BillingService
from tests.helpers import (
    make_customer,
    register_ok,
    super_admin_headers,
)


def _client_and_token(client, email):
    registration = register_ok(client, email)
    client_id = registration["user"]["client_id"]
    admin_headers = super_admin_headers(client)
    agent = client.post(
        f"/api/v1/admin/clients/{client_id}/agents",
        headers=admin_headers,
        json={
            "name": "Sarvam agent",
            "provider": "sarvam",
            "provider_agent_id": f"provider-{client_id}",
            "phone_number": f"+9197000000{client_id:02d}",
        },
    )
    assert agent.status_code == 201, agent.text
    credential = client.post(
        f"/api/v1/admin/clients/{client_id}/tool-token",
        headers=admin_headers,
    )
    assert credential.status_code == 200, credential.text
    return {
        "id": client_id,
        "token": credential.json()["data"]["token"],
        "agent": agent.json()["data"],
        "tenant_token": registration["tokens"]["access_token"],
    }


def _completed_payload(tenant, **overrides):
    return {
        "app_id": tenant["agent"]["provider_agent_id"],
        "interaction_id": "sarvam-interaction-1",
        "from_number": "+919876543210",
        "to_number": tenant["agent"]["phone_number"],
        "duration": 42.5,
        "start_time": "2032-05-01T10:00:00Z",
        "end_time": "2032-05-01T10:00:43Z",
        "interaction_transcript": [
            {"role": "agent", "en_text": "Hello, how can I help?"},
            {"role": "user", "en_text": "Please call +919876543210"},
        ],
        "final_agent_variables": {"api_key": "must-not-be-stored"},
        "metadata": {"access_token": tenant["token"]},
        **overrides,
    }


def test_call_completed_is_tenant_scoped_idempotent_sanitized_and_billable(client, db):
    tenant = _client_and_token(client, "call-completed-a@example.com")
    make_customer(client, tenant["tenant_token"], "Caller", "+919876543210")
    payload = _completed_payload(tenant)
    path = f"/api/v1/webhooks/sarvam/{tenant['id']}/call-completed"

    first = client.post(
        path,
        json=payload,
        headers={"X-Webhook-Token": tenant["token"]},
    )
    second = client.post(
        path,
        json=payload,
        headers={"Authorization": f"Bearer {tenant['token']}"},
    )

    assert first.status_code == second.status_code == 200
    assert first.json()["status"] == "processed"
    assert second.json()["status"] == "duplicate"
    calls = db.scalars(select(Call)).all()
    assert len(calls) == 1
    call = calls[0]
    assert call.client_id == tenant["id"]
    assert call.agent_id == tenant["agent"]["id"]
    assert call.direction == CallDirection.INBOUND
    assert call.status == CallStatus.COMPLETED
    assert call.duration == 43
    assert call.started_at.isoformat().startswith("2032-05-01T10:00:00")
    assert "agent: Hello, how can I help?" in call.transcript

    event = db.scalar(
        select(WebhookEvent).where(WebhookEvent.event_id == "sarvam-interaction-1")
    )
    assert event.status == WebhookEventStatus.DUPLICATE
    serialized = json.dumps(event.payload)
    assert tenant["token"] not in serialized
    assert "must-not-be-stored" not in serialized
    assert "api_key" not in serialized and "access_token" not in serialized
    assert "+919876543210" not in serialized
    assert BillingService(db).get_billing_me(tenant["id"])["minutes_used"] == 1


def test_call_completed_maps_outbound_and_nonconnected_calls_without_billing(client, db):
    tenant = _client_and_token(client, "call-completed-outbound@example.com")
    payload = _completed_payload(
        tenant,
        interaction_id="sarvam-outbound-1",
        attempt_id="sarvam-attempt-1",
        app_id="unmatched-provider-id",
        from_number=tenant["agent"]["phone_number"],
        to_number="+919811112222",
        duration=42.5,
        connectivity_status="connected",
    )
    response = client.post(
        f"/api/v1/webhooks/sarvam/{tenant['id']}/call-completed",
        json=payload,
        headers={"X-Webhook-Token": tenant["token"]},
    )
    failed = client.post(
        f"/api/v1/webhooks/sarvam/{tenant['id']}/call-completed",
        json={
            "attempt_id": "sarvam-attempt-no-answer",
            "from_number": tenant["agent"]["phone_number"],
            "to_number": "+919811112223",
            "completion_status": "failed",
            "duration": 55,
        },
        headers={"X-Webhook-Token": tenant["token"]},
    )
    missed = client.post(
        f"/api/v1/webhooks/sarvam/{tenant['id']}/call-completed",
        json={
            "interaction_id": "sarvam-missed-inbound",
            "from_number": "+919811112224",
            "to_number": tenant["agent"]["phone_number"],
            "duration": None,
        },
        headers={"X-Webhook-Token": tenant["token"]},
    )

    assert response.status_code == failed.status_code == missed.status_code == 200
    outbound = db.scalar(
        select(Call).where(Call.provider_call_id == "sarvam-outbound-1")
    )
    assert outbound.direction == CallDirection.OUTBOUND
    assert outbound.agent_id == tenant["agent"]["id"]
    assert outbound.duration == 43 and outbound.status == CallStatus.COMPLETED
    no_answer = db.scalar(
        select(Call).where(Call.provider_call_id.is_(None))
    )
    assert no_answer.direction == CallDirection.OUTBOUND
    assert no_answer.status == CallStatus.FAILED
    assert no_answer.duration is None
    missed_call = db.scalar(
        select(Call).where(Call.provider_call_id == "sarvam-missed-inbound")
    )
    assert missed_call.direction == CallDirection.INBOUND
    assert missed_call.status == CallStatus.MISSED and missed_call.duration is None
    assert BillingService(db).get_billing_me(tenant["id"])["minutes_used"] == 1


def test_unusable_or_unlinked_call_payloads_are_handled_without_leaking_credentials(
    client, db,
):
    tenant = _client_and_token(client, "call-completed-unlinked@example.com")
    endpoint = f"/api/v1/webhooks/sarvam/{tenant['id']}/call-completed"
    ignored = client.post(endpoint, json={"duration": 8},
                          headers={"X-Webhook-Token": tenant["token"]})
    assert ignored.status_code == 200 and ignored.json()["status"] == "ignored"
    assert db.scalar(select(func.count(WebhookEvent.id))) == 0

    body = _completed_payload(
        tenant,
        interaction_id="unlinked-interaction",
        app_id="unlinked-app",
        to_number="+919799999999",
    )
    response = client.post(endpoint, json=body,
                           headers={"X-Webhook-Token": tenant["token"]})
    assert response.status_code == 200 and response.json()["status"] == "processed"
    call = db.scalar(
        select(Call).where(Call.provider_call_id == "unlinked-interaction")
    )
    assert call.agent_id is None
    warning = db.scalar(
        select(AuditLog).where(
            AuditLog.client_id == tenant["id"],
            AuditLog.action == "sarvam_tool.call_unlinked_agent",
        )
    )
    assert warning is not None
    assert warning.level == "warning" and warning.details["app_id"] == "unlinked-app"


def test_call_completed_rejects_wrong_tenant_legacy_and_path_token_precedence(
    client, db,
):
    tenant_a = _client_and_token(client, "call-completed-scope-a@example.com")
    tenant_b = _client_and_token(client, "call-completed-scope-b@example.com")
    before = db.scalar(select(func.count(WebhookEvent.id)))
    audit_before = db.scalar(select(func.count(AuditLog.id)))
    payload = _completed_payload(tenant_a, interaction_id="must-not-persist")
    wrong_tenant = client.post(
        f"/api/v1/webhooks/sarvam/{tenant_b['id']}/call-completed",
        json=payload,
        headers={"X-Webhook-Token": tenant_a["token"]},
    )
    wrong_path = client.post(
        f"/api/v1/webhooks/sarvam/wrong/{tenant_a['id']}/call-completed",
        json=payload,
        headers={"X-Webhook-Token": tenant_a["token"]},
    )
    legacy = client.post(
        f"/api/v1/webhooks/sarvam/{tenant_a['id']}/call-completed",
        json=payload,
        headers={"X-Webhook-Token": get_settings().sarvam_webhook_secret},
    )

    assert wrong_tenant.status_code == wrong_path.status_code == legacy.status_code == 404
    assert db.scalar(select(func.count(WebhookEvent.id))) == before
    assert db.scalar(select(func.count(Call.id))) == 0
    assert db.scalar(select(func.count(AuditLog.id))) == audit_before


def test_call_completed_path_token_takes_precedence_and_per_client_token_is_scoped(
    client, db,
):
    tenant = _client_and_token(client, "call-completed-path@example.com")
    payload = _completed_payload(tenant, interaction_id="path-token-wins")
    response = client.post(
        f"/api/v1/webhooks/sarvam/{tenant['token']}/{tenant['id']}/call-completed",
        json=payload,
        headers={"X-Webhook-Token": "invalid-header-token"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "processed"


def test_call_completed_duplicate_id_does_not_modify_another_tenant_event(client, db):
    tenant_a = _client_and_token(client, "call-completed-collision-a@example.com")
    tenant_b = _client_and_token(client, "call-completed-collision-b@example.com")
    shared_id = "provider-interaction-id"
    first = client.post(
        f"/api/v1/webhooks/sarvam/{tenant_b['id']}/call-completed",
        json=_completed_payload(tenant_b, interaction_id=shared_id),
        headers={"X-Webhook-Token": tenant_b["token"]},
    )
    collision = client.post(
        f"/api/v1/webhooks/sarvam/{tenant_a['id']}/call-completed",
        json=_completed_payload(tenant_a, interaction_id=shared_id),
        headers={"X-Webhook-Token": tenant_a["token"]},
    )

    assert first.status_code == collision.status_code == 200
    assert first.json()["status"] == "processed"
    assert collision.json()["status"] == "ignored"
    event = db.scalar(
        select(WebhookEvent).where(WebhookEvent.event_id == shared_id)
    )
    assert event.client_id == tenant_b["id"]
    assert event.status == WebhookEventStatus.PROCESSED
    assert db.scalar(select(Call).where(Call.client_id == tenant_a["id"])) is None
