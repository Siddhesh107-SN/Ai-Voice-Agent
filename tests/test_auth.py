from datetime import timedelta

from jose import jwt
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token
from app.models.client import Client
from app.models.enums import ClientStatus, UserRole
from app.models.user import User
from tests.helpers import PASSWORD, auth_headers, register, register_ok


def login(client, email, password=PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


# ---------- registration ----------
def test_register_creates_client_and_admin(client, db):
    data = register_ok(client, "owner@a.com", "Salon A")
    user = data["user"]
    assert user["role"] == "client_admin" and user["client_id"] is not None
    assert data["tokens"]["access_token"] and data["tokens"]["refresh_token"]
    assert db.scalar(select(Client).where(Client.email == "owner@a.com")).business_name == "Salon A"


def test_register_never_exposes_or_stores_plain_password(client, db):
    resp = register(client, "owner@a.com")
    assert "password" not in resp.text.lower()
    stored = db.scalar(select(User).where(User.email == "owner@a.com")).password_hash
    assert stored.startswith("$argon2") and PASSWORD not in stored


def test_register_cannot_choose_role_or_client(client):
    resp = client.post("/api/v1/auth/register", json={
        "business_name": "Biz", "name": "X", "email": "x@a.com", "password": PASSWORD,
        "role": "super_admin", "client_id": 999})
    assert resp.status_code == 201
    assert resp.json()["data"]["user"]["role"] == "client_admin"
    assert resp.json()["data"]["user"]["client_id"] != 999


def test_register_duplicate_email_conflict(client):
    register_ok(client, "dup@a.com")
    resp = register(client, "DUP@a.com", "Other")
    assert resp.status_code == 409
    assert resp.json() == {"success": False, "message": "Email is already registered",
                           "error_code": "EMAIL_ALREADY_REGISTERED"}


def test_register_weak_password_rejected_without_echoing_it(client):
    resp = register(client, "w@a.com", password="short")
    assert resp.status_code == 422
    body = resp.json()
    assert body["error_code"] == "VALIDATION_ERROR" and body["success"] is False
    assert "short" not in resp.text.replace("Password must", "")


# ---------- login ----------
def test_login_success(client):
    register_ok(client, "u@a.com")
    resp = login(client, "u@a.com")
    assert resp.status_code == 200
    assert resp.json()["data"]["tokens"]["token_type"] == "bearer"


def test_login_invalid_password_and_unknown_email_look_identical(client):
    register_ok(client, "u@a.com")
    wrong = login(client, "u@a.com", "WrongPass123")
    unknown = login(client, "nobody@a.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert wrong.json()["error_code"] == "INVALID_CREDENTIALS"


def test_login_inactive_user_forbidden(client, db):
    register_ok(client, "u@a.com")
    db.scalar(select(User).where(User.email == "u@a.com")).is_active = False
    db.commit()
    resp = login(client, "u@a.com")
    assert resp.status_code == 403 and resp.json()["error_code"] == "USER_INACTIVE"


def test_login_disabled_client_forbidden(client, db):
    register_ok(client, "u@a.com")
    db.scalar(select(Client).where(Client.email == "u@a.com")).status = ClientStatus.DISABLED
    db.commit()
    resp = login(client, "u@a.com")
    assert resp.status_code == 403 and resp.json()["error_code"] == "CLIENT_DISABLED"


# ---------- /me and token handling ----------
def test_me_requires_authentication(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "NOT_AUTHENTICATED"


def test_me_returns_current_user(client):
    data = register_ok(client, "u@a.com")
    resp = client.get("/api/v1/auth/me", headers=auth_headers(data["tokens"]["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "u@a.com"
    assert "password_hash" not in resp.text


def test_access_token_contains_expected_claims(client):
    data = register_ok(client, "u@a.com")
    s = get_settings()
    claims = jwt.decode(data["tokens"]["access_token"], s.jwt_secret_key, algorithms=[s.jwt_algorithm])
    assert claims["sub"] == str(data["user"]["id"])
    assert claims["client_id"] == data["user"]["client_id"]
    assert claims["role"] == "client_admin" and claims["type"] == "access" and "exp" in claims


def test_expired_token_rejected(client):
    data = register_ok(client, "u@a.com")
    u = data["user"]
    token = create_access_token(u["id"], u["client_id"], UserRole.CLIENT_ADMIN,
                                expires_delta=timedelta(seconds=-5))
    resp = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert resp.status_code == 401 and resp.json()["error_code"] == "TOKEN_EXPIRED"


def test_garbage_and_tampered_tokens_rejected(client):
    data = register_ok(client, "u@a.com")
    good = data["tokens"]["access_token"]
    for bad in ["not-a-jwt", good[:-3] + "abc"]:
        resp = client.get("/api/v1/auth/me", headers=auth_headers(bad))
        assert resp.status_code == 401 and resp.json()["error_code"] == "INVALID_TOKEN"


def test_token_signed_with_other_secret_rejected(client):
    data = register_ok(client, "u@a.com")
    forged = jwt.encode({"sub": str(data["user"]["id"]), "client_id": data["user"]["client_id"],
                         "role": "client_admin", "type": "access", "exp": 9999999999},
                        "another-secret", algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers=auth_headers(forged)).status_code == 401


def test_token_with_forged_client_id_rejected(client):
    """Claims must match the DB: a token claiming another tenant is refused."""
    a = register_ok(client, "a@a.com", "Biz A")["user"]
    b = register_ok(client, "b@b.com", "Biz B")["user"]
    forged = create_access_token(a["id"], b["client_id"], UserRole.CLIENT_ADMIN)
    assert client.get("/api/v1/auth/me", headers=auth_headers(forged)).status_code == 401


def test_deactivated_user_loses_access_with_existing_token(client, db):
    data = register_ok(client, "u@a.com")
    db.scalar(select(User).where(User.email == "u@a.com")).is_active = False
    db.commit()
    resp = client.get("/api/v1/auth/me", headers=auth_headers(data["tokens"]["access_token"]))
    assert resp.status_code == 403


# ---------- refresh ----------
def test_refresh_returns_new_tokens(client):
    data = register_ok(client, "u@a.com")
    resp = client.post("/api/v1/auth/refresh",
                       json={"refresh_token": data["tokens"]["refresh_token"]})
    assert resp.status_code == 200
    new_access = resp.json()["data"]["access_token"]
    assert client.get("/api/v1/auth/me", headers=auth_headers(new_access)).status_code == 200


def test_access_token_cannot_be_used_to_refresh(client):
    data = register_ok(client, "u@a.com")
    resp = client.post("/api/v1/auth/refresh",
                       json={"refresh_token": data["tokens"]["access_token"]})
    assert resp.status_code == 401


def test_refresh_token_cannot_be_used_as_access_token(client):
    data = register_ok(client, "u@a.com")
    resp = client.get("/api/v1/auth/me", headers=auth_headers(data["tokens"]["refresh_token"]))
    assert resp.status_code == 401


def test_expired_refresh_token_rejected(client):
    u = register_ok(client, "u@a.com")["user"]
    token = create_refresh_token(u["id"], u["client_id"], UserRole.CLIENT_ADMIN,
                                 expires_delta=timedelta(seconds=-5))
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": token})
    assert resp.status_code == 401 and resp.json()["error_code"] == "TOKEN_EXPIRED"


# ---------- error format ----------
def test_unknown_route_uses_standard_error_shape(client):
    resp = client.get("/api/v1/nope")
    assert resp.status_code == 404
    assert set(resp.json()) == {"success", "message", "error_code"}


def test_login_rehashes_password_if_stored_with_weaker_parameters(client, db):
    """A password hashed with outdated Argon2 parameters is transparently upgraded on login."""
    from argon2 import PasswordHasher

    register_ok(client, "u@a.com")
    weak_hash = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1).hash(PASSWORD)
    user = db.scalar(select(User).where(User.email == "u@a.com"))
    user.password_hash = weak_hash
    db.commit()

    login(client, "u@a.com")
    db.refresh(user)
    assert user.password_hash != weak_hash and user.password_hash.startswith("$argon2")
