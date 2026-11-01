from app.services.email_service import EmailService
from tests.helpers import PASSWORD, register


RESET_PASSWORD = "AnotherSup3rPass9!"


def _capture_reset_email(monkeypatch):
    sent: dict[str, str] = {}
    monkeypatch.setattr(
        EmailService,
        "ensure_password_reset_delivery_configured",
        lambda self: None,
    )
    monkeypatch.setattr(
        EmailService,
        "send_password_reset_code",
        lambda self, email, code: sent.__setitem__(email, code),
    )
    return sent


def test_forgot_password_is_public_and_does_not_disclose_account(monkeypatch, client):
    sent = _capture_reset_email(monkeypatch)
    register(client, "reset_existing@test.com")

    existing = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset_existing@test.com"},
    )
    missing = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset_missing@test.com"},
    )

    assert existing.status_code == missing.status_code == 200
    assert existing.json()["message"] == missing.json()["message"]
    assert set(sent) == {"reset_existing@test.com"}


def test_reset_code_is_single_use_and_scoped_to_its_user(monkeypatch, client):
    sent = _capture_reset_email(monkeypatch)
    first = register(client, "reset_first@test.com", "First Tenant")
    register(client, "reset_second@test.com", "Second Tenant")
    first_access = first.json()["data"]["tokens"]["access_token"]
    first_refresh = first.json()["data"]["tokens"]["refresh_token"]

    requested = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset_first@test.com"},
    )
    assert requested.status_code == 200
    code = sent["reset_first@test.com"]

    cross_user = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "reset_second@test.com",
            "code": code,
            "new_password": RESET_PASSWORD,
        },
    )
    assert cross_user.status_code == 400
    assert cross_user.json()["code"] == "INVALID_RESET_CODE"

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "reset_first@test.com",
            "code": code,
            "new_password": RESET_PASSWORD,
        },
    )
    assert reset.status_code == 200
    assert "new_password" not in reset.json()
    assert "code" not in reset.json()

    reused = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "reset_first@test.com",
            "code": code,
            "new_password": "ThirdSup3rPass9!",
        },
    )
    assert reused.status_code == 400

    assert client.post(
        "/api/v1/auth/login",
        json={"email": "reset_first@test.com", "password": PASSWORD},
    ).status_code == 401
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "reset_first@test.com", "password": RESET_PASSWORD},
    ).status_code == 200
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "reset_second@test.com", "password": PASSWORD},
    ).status_code == 200
    assert client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh},
    ).status_code == 401
    assert client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {first_access}"},
    ).status_code == 401
