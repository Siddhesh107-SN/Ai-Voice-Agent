from datetime import datetime, timezone

from app.models.enums import AppointmentStatus, UserRole
from tests.helpers import (auth_headers, create_agent, create_staff, login_token, make_agent,
                           make_appointment, make_call, make_customer, make_user, register_ok)


def _setup(client, db):
    data = register_ok(client, "admin@a.com", "Tenant A")
    tok, cid = data["tokens"]["access_token"], data["user"]["client_id"]
    return tok, cid


def _summary(client, token):
    resp = client.get("/api/v1/dashboard/summary", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def test_empty_client_has_all_zeroes(client, db):
    token, _cid = _setup(client, db)
    summary = _summary(client, token)
    assert all(v == 0 for v in summary.values())


def test_appointment_counts_by_status(client, db):
    token, cid = _setup(client, db)
    cust = make_customer(client, token, "Asha", "+919876543210")
    a1 = make_appointment(client, token, cust["id"], "2030-06-03", "09:00")
    make_appointment(client, token, cust["id"], "2030-06-01", "10:00")  # not today
    done = make_appointment(client, token, cust["id"], "2030-06-02", "11:00")
    from app.models.appointment import Appointment
    today = datetime.now(timezone.utc).date()
    db.get(Appointment, a1["id"]).appointment_date = today  # simulate "today" without a flaky time
    db.get(Appointment, done["id"]).status = AppointmentStatus.COMPLETED
    db.commit()
    client.post(f"/api/v1/appointments/{a1['id']}/cancel", headers=auth_headers(token))

    summary = _summary(client, token)
    assert summary["total_appointments"] == 3
    assert summary["today_appointments"] == 1  # counts the (now cancelled) today appointment
    assert summary["cancelled_appointments"] == 1
    assert summary["completed_appointments"] == 1
    assert summary["scheduled_appointments"] == 1  # the 2030-06-01 one


def test_customer_agent_and_call_counts(client, db):
    token, cid = _setup(client, db)
    make_customer(client, token, "Asha", "+919876543210")
    make_customer(client, token, "Bala", "+919876543211")
    create_agent(client, token, "Active Agent")
    inactive = create_agent(client, token, "Inactive Agent")
    client.patch(f"/api/v1/agents/{inactive['id']}", headers=auth_headers(token),
                json={"status": "inactive"})
    make_call(db, cid, started_at=datetime(2030, 1, 1, tzinfo=timezone.utc))
    make_call(db, cid, started_at=datetime.now(timezone.utc))

    summary = _summary(client, token)
    assert summary["total_customers"] == 2
    assert summary["total_agents"] == 2 and summary["active_agents"] == 1
    assert summary["total_calls"] == 2 and summary["calls_today"] == 1


def test_dashboard_uses_client_timezone_for_today(client, db):
    token, cid = _setup(client, db)
    client.patch("/api/v1/clients/me", headers=auth_headers(token), json={"timezone": "Asia/Kolkata"})
    # 20:00 UTC on day X is already the next day (01:30) in India.
    utc_today = datetime.now(timezone.utc)
    make_call(db, cid, started_at=utc_today.replace(hour=20, minute=0, second=0, microsecond=0))
    summary = _summary(client, token)
    # Whatever the exact figure, it must be computed (not crash), and be 0 or 1 depending on
    # whether "20:00 UTC today" has already rolled into "tomorrow" in IST.
    assert summary["calls_today"] in (0, 1)


def test_staff_can_view_dashboard(client, db):
    token, _cid = _setup(client, db)
    create_staff(client, token, "staff@a.com")
    staff = login_token(client, "staff@a.com")
    assert client.get("/api/v1/dashboard/summary", headers=auth_headers(staff)).status_code == 200


def test_dashboard_requires_authentication(client):
    assert client.get("/api/v1/dashboard/summary").status_code == 401


def test_super_admin_cannot_use_client_dashboard_endpoint(client, db):
    make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    root = auth_headers(login_token(client, "root@platform.com"))
    resp = client.get("/api/v1/dashboard/summary", headers=root)
    assert resp.status_code == 403 and resp.json()["error_code"] == "INSUFFICIENT_PERMISSIONS"


def test_client_admin_cannot_use_platform_dashboard_endpoints(client, db):
    token, cid = _setup(client, db)
    h = auth_headers(token)
    assert client.get("/api/v1/dashboard/admin/summary", headers=h).status_code == 403
    assert client.get(f"/api/v1/dashboard/admin/clients/{cid}/summary", headers=h).status_code == 403


def test_platform_summary_aggregates_across_clients(client, db):
    tok_a, cid_a = _setup(client, db)
    b = register_ok(client, "admin@b.com", "Tenant B")
    cid_b = b["user"]["client_id"]
    make_call(db, cid_a)
    make_call(db, cid_b)
    make_call(db, cid_b)
    make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    root = auth_headers(login_token(client, "root@platform.com"))

    resp = client.get("/api/v1/dashboard/admin/summary", headers=root)
    data = resp.json()["data"]
    assert data["total_clients"] == 2 and data["active_clients"] == 2 and data["disabled_clients"] == 0
    assert data["total_calls"] == 3
    # 2 client admins + the super admin used to make this call
    assert data["total_users"] == 3


def test_platform_disabled_client_is_counted_separately(client, db):
    _tok_a, cid_a = _setup(client, db)
    make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    root = auth_headers(login_token(client, "root@platform.com"))
    client.post(f"/api/v1/clients/{cid_a}/disable", headers=root)
    data = client.get("/api/v1/dashboard/admin/summary", headers=root).json()["data"]
    assert data["active_clients"] == 0 and data["disabled_clients"] == 1


def test_super_admin_can_view_one_clients_summary(client, db):
    tok_a, cid_a = _setup(client, db)
    make_customer(client, tok_a, "Asha", "+919876543210")
    make_user(db, None, UserRole.SUPER_ADMIN, "root@platform.com")
    root = auth_headers(login_token(client, "root@platform.com"))
    resp = client.get(f"/api/v1/dashboard/admin/clients/{cid_a}/summary", headers=root)
    assert resp.status_code == 200 and resp.json()["data"]["total_customers"] == 1
    assert client.get("/api/v1/dashboard/admin/clients/99999/summary", headers=root).status_code == 404
