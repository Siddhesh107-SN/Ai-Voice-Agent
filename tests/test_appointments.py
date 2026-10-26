from sqlalchemy import select

from app.models.appointment import Appointment, AppointmentHistory
from app.models.enums import AppointmentStatus
from tests.helpers import (auth_headers, create_staff, login_token, make_appointment,
                           make_customer, register_ok)


def _setup(client):
    token = register_ok(client, "admin@a.com", "Tenant A")["tokens"]["access_token"]
    return token, make_customer(client, token)


def test_create_returns_customer_and_normalized_time(client):
    token, cust = _setup(client)
    appt = make_appointment(client, token, cust["id"], at="10:00:45")
    assert appt["status"] == "scheduled" and appt["appointment_time"] == "10:00:00"
    assert appt["customer"] == {"id": cust["id"], "name": "Asha", "phone": cust["phone"]}


def test_create_validation(client):
    token, cust = _setup(client)
    headers = auth_headers(token)
    base = {"customer_id": cust["id"], "appointment_date": "2030-01-15", "appointment_time": "10:00"}
    assert client.post("/api/v1/appointments", headers=headers,
                       json={**base, "appointment_date": "not-a-date"}).status_code == 422
    assert client.post("/api/v1/appointments", headers=headers,
                       json={**base, "appointment_time": "10:00+05:30"}).status_code == 422
    assert client.post("/api/v1/appointments", headers=headers,
                       json={**base, "status": "cancelled"}).status_code == 422
    unknown = client.post("/api/v1/appointments", headers=headers, json={**base, "customer_id": 9999})
    assert unknown.status_code == 404 and unknown.json()["error_code"] == "CUSTOMER_NOT_FOUND"


def test_same_customer_same_slot_conflicts_but_cancelled_slot_is_free(client, db):
    token, cust = _setup(client)
    first = make_appointment(client, token, cust["id"])
    dup = client.post("/api/v1/appointments", headers=auth_headers(token), json={
        "customer_id": cust["id"], "appointment_date": "2030-01-15", "appointment_time": "10:00"})
    assert dup.status_code == 409 and dup.json()["error_code"] == "APPOINTMENT_CONFLICT"
    db.get(Appointment, first["id"]).status = AppointmentStatus.CANCELLED
    db.commit()
    make_appointment(client, token, cust["id"])  # slot is free again


def test_create_writes_history_entry(client):
    token, cust = _setup(client)
    appt = make_appointment(client, token, cust["id"])
    hist = client.get(f"/api/v1/appointments/{appt['id']}/history", headers=auth_headers(token))
    entries = hist.json()["data"]
    assert len(entries) == 1 and entries[0]["action"] == "created"
    assert entries[0]["new_date"] == "2030-01-15"


def test_list_filters(client):
    token, cust = _setup(client)
    other = make_customer(client, token, "Bala", "+919876543299")
    a1 = make_appointment(client, token, cust["id"], "2030-01-15", "09:00")
    make_appointment(client, token, cust["id"], "2030-01-16", "09:00", status="confirmed")
    make_appointment(client, token, other["id"], "2030-01-17", "11:00")
    h = auth_headers(token)

    def ids(qs):
        return [a["id"] for a in client.get(f"/api/v1/appointments?{qs}", headers=h).json()["data"]]

    assert len(ids("")) == 3
    assert ids("date=2030-01-15") == [a1["id"]]
    assert len(ids("status=confirmed")) == 1
    assert len(ids(f"customer={other['id']}")) == 1
    assert len(ids("date_from=2030-01-16&date_to=2030-01-17")) == 2
    assert client.get("/api/v1/appointments?status=bogus", headers=h).status_code == 422


def test_list_is_sorted_and_paginated(client):
    token, cust = _setup(client)
    make_appointment(client, token, cust["id"], "2030-02-01", "12:00")
    make_appointment(client, token, cust["id"], "2030-01-01", "12:00")
    make_appointment(client, token, cust["id"], "2030-01-01", "08:00")
    body = client.get("/api/v1/appointments?page=1&limit=2", headers=auth_headers(token)).json()
    assert body["pagination"] == {"page": 1, "limit": 2, "total": 3}
    assert [(a["appointment_date"], a["appointment_time"]) for a in body["data"]] == [
        ("2030-01-01", "08:00:00"), ("2030-01-01", "12:00:00")]


def test_update_notes_status_and_history(client):
    token, cust = _setup(client)
    appt = make_appointment(client, token, cust["id"])
    h = auth_headers(token)
    resp = client.patch(f"/api/v1/appointments/{appt['id']}", headers=h,
                        json={"notes": "Bring ID", "status": "confirmed"})
    assert resp.status_code == 200
    assert resp.json()["data"]["notes"] == "Bring ID" and resp.json()["data"]["status"] == "confirmed"
    actions = [(e["action"], e["old_status"], e["new_status"]) for e in
               client.get(f"/api/v1/appointments/{appt['id']}/history", headers=h).json()["data"]]
    assert actions[-1] == ("updated", "scheduled", "confirmed")
    cleared = client.patch(f"/api/v1/appointments/{appt['id']}", headers=h, json={"notes": None})
    assert cleared.json()["data"]["notes"] is None


def test_patch_cannot_change_date_time_or_cancel(client):
    token, cust = _setup(client)
    appt = make_appointment(client, token, cust["id"])
    h = auth_headers(token)
    for body in ({"appointment_date": "2031-01-01"}, {"appointment_time": "11:00"},
                 {"status": "cancelled"}, {"status": "rescheduled"}, {"client_id": 5}):
        assert client.patch(f"/api/v1/appointments/{appt['id']}", headers=h,
                            json=body).status_code == 422


def test_cancelled_appointment_cannot_be_edited_and_completed_cannot_reopen(client, db):
    token, cust = _setup(client)
    h = auth_headers(token)
    cancelled = make_appointment(client, token, cust["id"], "2030-03-01")
    done = make_appointment(client, token, cust["id"], "2030-03-02")
    db.get(Appointment, cancelled["id"]).status = AppointmentStatus.CANCELLED
    db.get(Appointment, done["id"]).status = AppointmentStatus.COMPLETED
    db.commit()
    r1 = client.patch(f"/api/v1/appointments/{cancelled['id']}", headers=h, json={"notes": "x"})
    assert r1.status_code == 409 and r1.json()["error_code"] == "APPOINTMENT_NOT_EDITABLE"
    r2 = client.patch(f"/api/v1/appointments/{done['id']}", headers=h, json={"status": "scheduled"})
    assert r2.status_code == 409 and r2.json()["error_code"] == "INVALID_STATUS_TRANSITION"
    assert client.patch(f"/api/v1/appointments/{done['id']}", headers=h,
                        json={"notes": "paid"}).status_code == 200


def test_staff_can_create_and_update_but_not_delete(client):
    from tests.helpers import elevated_headers, make_elevation_token
    token, cust = _setup(client)
    staff_user = create_staff(client, token, "staff@a.com")
    staff = login_token(client, "staff@a.com")
    assert client.post("/api/v1/appointments", headers=auth_headers(staff),
                       json={"customer_id": cust["id"], "appointment_date": "2030-01-15",
                             "appointment_time": "10:00"}).status_code == 403
    elev = make_elevation_token(staff_user["id"], staff_user["client_id"])
    h_elev = elevated_headers(staff, elev)
    resp = client.post("/api/v1/appointments", headers=h_elev,
                       json={"customer_id": cust["id"], "appointment_date": "2030-01-15",
                             "appointment_time": "10:00"})
    assert resp.status_code == 201
    appt = resp.json()["data"]
    assert client.patch(f"/api/v1/appointments/{appt['id']}", headers=h_elev,
                        json={"status": "confirmed"}).status_code == 200
    assert client.delete(f"/api/v1/appointments/{appt['id']}", headers=h_elev).status_code == 403


def test_admin_delete_removes_appointment_and_history_but_keeps_audit_snapshot(client, db):
    from app.models.audit_log import AuditLog
    token, cust = _setup(client)
    appt = make_appointment(client, token, cust["id"])
    assert client.delete(f"/api/v1/appointments/{appt['id']}", headers=auth_headers(token)).status_code == 200
    assert client.get(f"/api/v1/appointments/{appt['id']}", headers=auth_headers(token)).status_code == 404
    assert db.scalar(select(AppointmentHistory).where(AppointmentHistory.appointment_id == appt["id"])) is None
    log = db.scalar(select(AuditLog).where(AuditLog.action == "appointment.delete"))
    assert log.details["date"] == "2030-01-15" and log.details["status"] == "scheduled"


def test_audit_details_do_not_contain_personal_data(client, db):
    from app.models.audit_log import AuditLog
    token, _cust = _setup(client)
    text = " ".join(str(a.details) for a in db.scalars(select(AuditLog)).all())
    assert "+91" not in text and "Asha" not in text


def test_appointments_require_authentication(client):
    assert client.get("/api/v1/appointments").status_code == 401


def test_moving_appointment_onto_another_customers_booked_slot_conflicts(client):
    token, cust = _setup(client)
    other = make_customer(client, token, "Bala", "+919876543288")
    mine = make_appointment(client, token, cust["id"], "2030-08-08", "09:00")
    make_appointment(client, token, other["id"], "2030-08-08", "10:00")
    resp = client.patch(f"/api/v1/appointments/{mine['id']}", headers=auth_headers(token),
                        json={"customer_id": other["id"]})
    # The appointment stays at 09:00, so this must NOT conflict with Bala's 10:00 slot.
    assert resp.status_code == 200

    third = make_appointment(client, token, cust["id"], "2030-08-09", "09:00")
    make_appointment(client, token, other["id"], "2030-08-09", "09:00")
    conflict = client.patch(f"/api/v1/appointments/{third['id']}", headers=auth_headers(token),
                            json={"customer_id": other["id"]})
    assert conflict.status_code == 409 and conflict.json()["error_code"] == "APPOINTMENT_CONFLICT"
