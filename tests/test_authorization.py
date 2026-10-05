"""RBAC and tenant-resolution dependencies."""
from fastapi import Depends

from app.core.dependencies import TenantId, require_roles
from app.core.security import create_access_token
from app.models.client import Client
from app.models.enums import UserRole
from app.models.user import User
from tests.helpers import PASSWORD, auth_headers, register_ok


def _app_with_probe_routes(app):
    @app.get("/probe/admin-only", dependencies=[Depends(require_roles(UserRole.CLIENT_ADMIN))])
    def admin_only():
        return {"ok": True}

    @app.get("/probe/tenant")
    def tenant(tenant_id: TenantId):
        return {"tenant_id": tenant_id}

    return app


def _make_user(db, client_id, role, email):
    from app.core.security import hash_password
    user = User(client_id=client_id, name="U", email=email,
                password_hash=hash_password(PASSWORD), role=role)
    db.add(user)
    db.commit()
    return user


def test_require_roles_allows_and_denies(app, client, db):
    _app_with_probe_routes(app)
    data = register_ok(client, "admin@a.com")
    staff = _make_user(db, data["user"]["client_id"], UserRole.CLIENT_STAFF, "staff@a.com")
    staff_token = create_access_token(staff.id, staff.client_id, staff.role)

    ok = client.get("/probe/admin-only", headers=auth_headers(data["tokens"]["access_token"]))
    denied = client.get("/probe/admin-only", headers=auth_headers(staff_token))
    assert ok.status_code == 200
    assert denied.status_code == 403
    assert denied.json()["error_code"] == "INSUFFICIENT_PERMISSIONS"


def test_tenant_comes_from_token_user_and_ignores_query_param(app, client):
    _app_with_probe_routes(app)
    a = register_ok(client, "a@a.com", "Biz A")
    b = register_ok(client, "b@b.com", "Biz B")
    resp = client.get(f"/probe/tenant?client_id={b['user']['client_id']}",
                      headers=auth_headers(a["tokens"]["access_token"]))
    assert resp.json()["tenant_id"] == a["user"]["client_id"]


def test_super_admin_has_no_tenant(app, client, db):
    _app_with_probe_routes(app)
    root = _make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    token = create_access_token(root.id, None, root.role)
    resp = client.get("/probe/tenant", headers=auth_headers(token))
    assert resp.status_code == 403 and resp.json()["error_code"] == "TENANT_REQUIRED"
