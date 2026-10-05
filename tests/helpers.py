import httpx  # noqa: F401  (only referenced in a type comment above)
"""Shared test helpers."""
from fastapi.testclient import TestClient

PASSWORD = "Sup3rSecret1"


def register(client: TestClient, email: str, business: str = "Biz", password: str = PASSWORD):
    return client.post("/api/v1/auth/register", json={
        "business_name": business, "name": "Owner", "email": email, "password": password})


def register_ok(client: TestClient, email: str, business: str = "Biz") -> dict:
    resp = register(client, email, business)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def make_user(db, client_id, role, email, password: str = PASSWORD):
    """Insert a user directly (used for SUPER_ADMIN, which the API cannot create)."""
    from app.core.security import hash_password
    from app.models.user import User

    user = User(client_id=client_id, name="Test User", email=email,
                password_hash=hash_password(password), role=role)
    db.add(user)
    db.commit()
    return user


def login_token(client: TestClient, email: str, password: str = PASSWORD) -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["tokens"]["access_token"]


def create_staff(client: TestClient, admin_token: str, email: str, role: str = "client_staff") -> dict:
    resp = client.post("/api/v1/users", headers=auth_headers(admin_token), json={
        "name": "Staff", "email": email, "password": PASSWORD, "role": role})
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def make_customer(client: TestClient, token: str, name: str = "Asha", phone: str = "+919876543210") -> dict:
    resp = client.post("/api/v1/customers", headers=auth_headers(token),
                       json={"name": name, "phone": phone})
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def make_appointment(client: TestClient, token: str, customer_id: int,
                     day: str = "2030-01-15", at: str = "10:00", **extra) -> dict:
    resp = client.post("/api/v1/appointments", headers=auth_headers(token), json={
        "customer_id": customer_id, "appointment_date": day, "appointment_time": at, **extra})
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def make_agent(db, client_id: int, name: str = "Agent", **kw):
    """Insert an agent directly (the agent API arrives in Stage 8)."""
    from app.models.agent import Agent

    agent = Agent(client_id=client_id, name=name, provider="sarvam", **kw)
    db.add(agent)
    db.commit()
    return agent


def make_call(db, client_id: int, **kw):
    """Insert a call directly (calls are created by provider webhooks in Stage 9)."""
    from app.models.call import Call
    from app.models.enums import CallDirection, CallStatus

    defaults = dict(phone_number="+919876543210", direction=CallDirection.INBOUND,
                    status=CallStatus.COMPLETED)
    call = Call(client_id=client_id, **{**defaults, **kw})
    db.add(call)
    db.commit()
    return call


def create_agent(client: TestClient, token: str, name: str = "Zoya", **extra) -> dict:
    resp = client.post("/api/v1/agents", headers=auth_headers(token), json={"name": name, **extra})
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def webhook_body(**overrides) -> dict:
    """A minimal, valid Sarvam envelope; override event_type/call/appointment as needed."""
    body = {"event_id": "evt-1", "event_type": "call_started", "agent_id": "agent-ref-1"}
    body.update(overrides)
    return body


def send_webhook(client: TestClient, body: dict, secret: str = "test-sarvam-webhook-secret",
                 signature: str | None = "__compute__") -> "httpx.Response":
    import hashlib
    import hmac
    import json

    raw = json.dumps(body).encode()
    if signature == "__compute__":
        signature = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    headers = {"Content-Type": "application/json"}
    if signature is not None:
        headers["X-Sarvam-Signature"] = signature
    return client.post("/api/v1/webhooks/sarvam", content=raw, headers=headers)
