"""Functional tests for staff management. Isolation lives in test_multi_tenant_security.py."""
from app.models.enums import UserRole
from tests.helpers import PASSWORD, auth_headers, create_staff, login_token, register_ok


def _admin(client):
    return register_ok(client, "admin@a.com", "Tenant A")["tokens"]["access_token"]


def test_list_filters_by_role_and_active_status(client):
    token = _admin(client)
    h = auth_headers(token)
    staff = create_staff(client, token, "staff@a.com")
    client.patch(f"/api/v1/users/{staff['id']}", headers=h, json={"is_active": False})

    admins = client.get("/api/v1/users?role=client_admin", headers=h).json()["data"]
    assert {u["role"] for u in admins} == {"client_admin"}

    active = client.get("/api/v1/users?is_active=true", headers=h).json()["data"]
    assert all(u["is_active"] for u in active) and staff["id"] not in [u["id"] for u in active]

    inactive = client.get("/api/v1/users?is_active=false", headers=h).json()["data"]
    assert [u["id"] for u in inactive] == [staff["id"]]


def test_create_defaults_to_client_staff(client):
    token = _admin(client)
    resp = client.post("/api/v1/users", headers=auth_headers(token), json={
        "name": "New Person", "email": "new@a.com", "password": PASSWORD})
    assert resp.status_code == 201 and resp.json()["data"]["role"] == "client_staff"


def test_create_can_specify_client_admin_role(client):
    token = _admin(client)
    resp = client.post("/api/v1/users", headers=auth_headers(token), json={
        "name": "Co Admin", "email": "coadmin@a.com", "password": PASSWORD, "role": "client_admin"})
    assert resp.status_code == 201 and resp.json()["data"]["role"] == "client_admin"


def test_update_name_and_role(client):
    token = _admin(client)
    staff = create_staff(client, token, "staff@a.com")
    resp = client.patch(f"/api/v1/users/{staff['id']}", headers=auth_headers(token),
                        json={"name": "Renamed", "role": "client_admin"})
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Renamed" and resp.json()["data"]["role"] == "client_admin"


def test_unknown_user_404(client):
    token = _admin(client)
    resp = client.get("/api/v1/users/99999", headers=auth_headers(token))
    assert resp.status_code == 404 and resp.json()["error_code"] == "USER_NOT_FOUND"


def test_second_admin_can_deactivate_first_admin(client):
    """Self-modification is blocked, but a peer admin isn't."""
    token = _admin(client)
    h = auth_headers(token)
    co_admin = client.post("/api/v1/users", headers=h, json={
        "name": "Co Admin", "email": "coadmin@a.com", "password": PASSWORD,
        "role": "client_admin"}).json()["data"]
    co_token = login_token(client, "coadmin@a.com")
    resp = client.patch(f"/api/v1/users/{co_admin['id']}", headers=auth_headers(token),
                        json={"is_active": False})
    assert resp.status_code == 200
    assert client.get("/api/v1/auth/me", headers=auth_headers(co_token)).status_code == 403
