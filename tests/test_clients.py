"""Functional tests for the Clients API (SUPER_ADMIN management + own-profile endpoints).
Cross-tenant isolation for these same endpoints lives in test_multi_tenant_security.py."""
from app.models.enums import UserRole
from tests.helpers import PASSWORD, auth_headers, login_token, make_user, register_ok


def _super_admin(client, db):
    make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    return auth_headers(login_token(client, "root@platform.com"))


def test_super_admin_creates_client_with_timezone(client, db):
    root = _super_admin(client, db)
    resp = client.post("/api/v1/clients", headers=root, json={
        "business_name": "Created Co", "email": "hello@created.com", "timezone": "Asia/Kolkata",
        "admin": {"name": "Boss", "email": "boss@created.com", "password": PASSWORD}})
    assert resp.status_code == 201 and resp.json()["data"]["timezone"] == "Asia/Kolkata"


def test_super_admin_create_client_rejects_bad_timezone(client, db):
    root = _super_admin(client, db)
    resp = client.post("/api/v1/clients", headers=root, json={
        "business_name": "Bad TZ Co", "email": "badtz@created.com", "timezone": "Nowhere/Land",
        "admin": {"name": "Boss", "email": "boss2@created.com", "password": PASSWORD}})
    assert resp.status_code == 422


def test_super_admin_updates_client_fields_and_email(client, db):
    root = _super_admin(client, db)
    data = register_ok(client, "owner@a.com", "Tenant A")
    cid = data["user"]["client_id"]
    resp = client.patch(f"/api/v1/clients/{cid}", headers=root, json={
        "business_name": "Renamed Co", "email": "NEW@a.com", "phone": "+919000000000"})
    assert resp.status_code == 200
    updated = resp.json()["data"]
    assert updated["business_name"] == "Renamed Co" and updated["email"] == "new@a.com"
    assert updated["phone"] == "+919000000000"


def test_super_admin_update_to_taken_email_conflicts(client, db):
    root = _super_admin(client, db)
    register_ok(client, "owner@a.com", "Tenant A")
    b = register_ok(client, "owner@b.com", "Tenant B")
    resp = client.patch(f"/api/v1/clients/{b['user']['client_id']}", headers=root,
                        json={"email": "owner@a.com"})
    assert resp.status_code == 409 and resp.json()["error_code"] == "EMAIL_ALREADY_REGISTERED"


def test_super_admin_update_with_unchanged_email_does_not_conflict(client, db):
    root = _super_admin(client, db)
    data = register_ok(client, "owner@a.com", "Tenant A")
    resp = client.patch(f"/api/v1/clients/{data['user']['client_id']}", headers=root,
                        json={"email": "owner@a.com", "business_name": "Still A"})
    assert resp.status_code == 200 and resp.json()["data"]["business_name"] == "Still A"


def test_super_admin_lists_clients_with_status_and_search_filters(client, db):
    root = _super_admin(client, db)
    a = register_ok(client, "owner@a.com", "Acme Salon")
    register_ok(client, "owner@b.com", "Bravo Spa")
    client.post(f"/api/v1/clients/{a['user']['client_id']}/disable", headers=root)

    active = client.get("/api/v1/clients?status=active", headers=root).json()
    assert active["pagination"]["total"] == 1 and active["data"][0]["business_name"] == "Bravo Spa"

    disabled = client.get("/api/v1/clients?status=disabled", headers=root).json()
    assert disabled["data"][0]["business_name"] == "Acme Salon"

    found = client.get("/api/v1/clients?search=bravo", headers=root).json()
    assert found["pagination"]["total"] == 1 and found["data"][0]["business_name"] == "Bravo Spa"

    none_found = client.get("/api/v1/clients?search=nonexistent", headers=root).json()
    assert none_found["pagination"]["total"] == 0


def test_get_unknown_client_404(client, db):
    root = _super_admin(client, db)
    assert client.get("/api/v1/clients/99999", headers=root).status_code == 404


def test_client_profile_update_rejects_bad_timezone(client):
    token = register_ok(client, "owner@a.com", "Tenant A")["tokens"]["access_token"]
    resp = client.patch("/api/v1/clients/me", headers=auth_headers(token),
                        json={"timezone": "Nowhere/Land"})
    assert resp.status_code == 422
