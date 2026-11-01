import json

from sqlalchemy import select

from app.core.config import get_settings
from app.models.audit_log import AuditLog
from app.models.call import Call
from app.models.client import Client
from app.models.enums import AccessStatus, CallStatus, ClientStatus
from app.services.billing_service import BillingService
from tests.helpers import make_call, register_ok, super_admin_headers


def _client_and_token(client, email):
    registration = register_ok(client, email)
    client_id = registration["user"]["client_id"]
    response = client.post(
        f"/api/v1/admin/clients/{client_id}/tool-token",
        headers=super_admin_headers(client),
    )
    assert response.status_code == 200, response.text
    return client_id, response.json()["data"]["token"]


def _call_start(client, client_id, token, *, bearer=False):
    auth_header = (
        {"Authorization": f"Bearer {token}"}
        if bearer else {"X-Tool-Token": token}
    )
    return client.post(
        f"/api/v1/webhooks/sarvam/{client_id}/call-start",
        headers=auth_header,
    )


def test_call_start_uses_billing_and_enforces_configured_overage_grace(
    client, db, monkeypatch,
):
    monkeypatch.setattr(get_settings(), "overage_grace_percent", 10)
    client_id, token = _client_and_token(client, "call-start-overage@example.com")
    make_call(
        db, client_id, status=CallStatus.COMPLETED, duration=65940,
        provider_call_id="before-grace",
    )

    below_limit = _call_start(client, client_id, token, bearer=True)
    assert below_limit.status_code == 200
    assert below_limit.json() == {
        "service_active": True,
        "reason": "ok",
        "business_name": "Biz",
        "plan": "growth",
        "minutes_remaining": 0,
    }

    make_call(
        db, client_id, status=CallStatus.COMPLETED, duration=60,
        provider_call_id="at-grace-limit",
    )
    at_limit = _call_start(client, client_id, token)
    assert at_limit.status_code == 200
    assert at_limit.json()["service_active"] is False
    assert at_limit.json()["reason"] == "over_limit"
    assert BillingService(db).get_billing_me(client_id)["minutes_used"] == 1100

    audit = db.scalar(
        select(AuditLog).where(
            AuditLog.client_id == client_id,
            AuditLog.action == "sarvam_tool.call_start",
        )
    )
    assert audit is not None
    assert audit.level == "warning"
    assert audit.details["error_code"] == "OVER_LIMIT"
    assert token not in json.dumps(audit.details)


def test_call_start_blocks_suspended_and_inactive_clients(client, db):
    suspended_id, suspended_token = _client_and_token(
        client, "call-start-suspended@example.com"
    )
    suspended = db.get(Client, suspended_id)
    suspended.access_status = AccessStatus.SUSPENDED
    db.commit()

    inactive_id, inactive_token = _client_and_token(
        client, "call-start-inactive@example.com"
    )
    inactive = db.get(Client, inactive_id)
    inactive.status = ClientStatus.DISABLED
    inactive.is_active = False
    db.commit()

    suspended_result = _call_start(client, suspended_id, suspended_token).json()
    inactive_result = _call_start(client, inactive_id, inactive_token).json()
    assert suspended_result["service_active"] is False
    assert suspended_result["reason"] == "suspended"
    assert inactive_result["service_active"] is False
    assert inactive_result["reason"] == "inactive"
    assert db.scalar(select(Call).where(Call.client_id.in_(
        [suspended_id, inactive_id]
    ))) is None


def test_call_start_fails_open_when_billing_lookup_raises(
    client, monkeypatch, caplog,
):
    client_id, token = _client_and_token(client, "call-start-fail-open@example.com")

    def billing_failure(*args, **kwargs):
        raise RuntimeError("billing unavailable")

    monkeypatch.setattr(BillingService, "get_billing_me", billing_failure)
    response = _call_start(client, client_id, token)

    assert response.status_code == 200
    assert response.json()["service_active"] is True
    assert response.json()["reason"] == "ok"
    assert "allowing call" in caplog.text
    assert token not in caplog.text
