from sqlalchemy import select

from app.models.appointment import Appointment
from app.models.audit_log import AuditLog
from app.models.enums import AppointmentStatus
from tests.helpers import (auth_headers, create_staff, login_token, make_appointment,
                           make_customer, register_ok)


def _setup(client):
    token = register_ok(client, "admin@a.com", "Tenant A")["tokens"]["access_token"]
    cust = make_customer(client, token)
    return token, cust, make_appointment(client, token, cust["id"])


def test_cancel_sets_status_and_records_cancellation_and_history(client):
    token, cust, appt = _setup(client)
    h = auth_headers(token)
    resp = client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=h,
                       json={"reason": "Feeling unwell"})
    assert resp.status_code == 200 and resp.json()["data"]["status"] == "cancelled"

    listed = client.get("/api/v1/cancellations", headers=h).json()
    assert listed["pagination"]["total"] == 1
    row = listed["data"][0]
    assert row["appointment_id"] == appt["id"] and row["reason"] == "Feeling unwell"
    assert row["source"] == "user" and row["customer"]["id"] == cust["id"]
    assert row["appointment_date"] == "2030-01-15" and row["cancelled_by_user_id"]

    history = client.get(f"/api/v1/appointments/{appt['id']}/history", headers=h).json()["data"]
    assert [e["action"] for e in history] == ["created", "cancelled"]
    assert history[-1]["old_status"] == "scheduled" and history[-1]["new_status"] == "cancelled"


def test_cancel_without_body_is_allowed(client):
    token, _c, appt = _setup(client)
    resp = client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=auth_headers(token))
    assert resp.status_code == 200


def test_cannot_cancel_twice(client):
    token, _c, appt = _setup(client)
    h = auth_headers(token)
    client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=h)
    again = client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=h)
    assert again.status_code == 409 and again.json()["error_code"] == "APPOINTMENT_ALREADY_CANCELLED"
    assert client.get("/api/v1/cancellations", headers=h).json()["pagination"]["total"] == 1


def test_cannot_cancel_completed_appointment(client, db):
    token, _c, appt = _setup(client)
    db.get(Appointment, appt["id"]).status = AppointmentStatus.COMPLETED
    db.commit()
    resp = client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=auth_headers(token))
    assert resp.status_code == 409 and resp.json()["error_code"] == "APPOINTMENT_ALREADY_COMPLETED"


def test_cancel_unknown_appointment_404(client):
    token, _c, _a = _setup(client)
    resp = client.post("/api/v1/appointments/99999/cancel", headers=auth_headers(token))
    assert resp.status_code == 404 and resp.json()["error_code"] == "APPOINTMENT_NOT_FOUND"


def test_staff_can_cancel(client):
    from tests.helpers import elevated_headers, make_elevation_token
    token, _c, appt = _setup(client)
    staff_user = create_staff(client, token, "staff@a.com")
    staff = login_token(client, "staff@a.com")
    assert client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=auth_headers(staff)).status_code == 403
    elev = make_elevation_token(staff_user["id"], staff_user["client_id"])
    resp = client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=elevated_headers(staff, elev))
    assert resp.status_code == 200


def test_cancellation_filters_and_get(client):
    token, cust, appt = _setup(client)
    other = make_customer(client, token, "Bala", "+919876543299")
    appt2 = make_appointment(client, token, other["id"], "2030-02-02")
    h = auth_headers(token)
    for a in (appt, appt2):
        client.post(f"/api/v1/appointments/{a['id']}/cancel", headers=h)
    by_customer = client.get(f"/api/v1/cancellations?customer={other['id']}", headers=h).json()
    assert len(by_customer["data"]) == 1
    in_range = client.get("/api/v1/cancellations?date_from=2030-02-01", headers=h).json()
    assert [c["appointment_id"] for c in in_range["data"]] == [appt2["id"]]
    up_to = client.get("/api/v1/cancellations?date_to=2030-01-20", headers=h).json()
    assert [c["appointment_id"] for c in up_to["data"]] == [appt["id"]]
    assert client.get("/api/v1/cancellations?source=ai_agent", headers=h).json()["data"] == []
    one = by_customer["data"][0]["id"]
    assert client.get(f"/api/v1/cancellations/{one}", headers=h).status_code == 200
    assert client.get("/api/v1/cancellations/99999", headers=h).status_code == 404


def test_cancel_audit_omits_free_text_reason(client, db):
    token, _c, appt = _setup(client)
    client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=auth_headers(token),
                json={"reason": "my private reason"})
    logs = db.scalars(select(AuditLog).where(AuditLog.action == "appointment.cancel")).all()
    assert len(logs) == 1 and "private" not in str(logs[0].details)


def test_deleting_cancelled_appointment_also_removes_its_cancellation(client):
    token, _c, appt = _setup(client)
    h = auth_headers(token)
    client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=h)
    assert client.delete(f"/api/v1/appointments/{appt['id']}", headers=h).status_code == 200
    assert client.get("/api/v1/cancellations", headers=h).json()["data"] == []


def test_cancellations_require_authentication(client):
    assert client.get("/api/v1/cancellations").status_code == 401
    assert client.post("/api/v1/appointments/1/cancel").status_code == 401
