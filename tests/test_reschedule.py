from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from tests.helpers import (auth_headers, create_staff, login_token, make_appointment,
                           make_customer, register_ok)


def _setup(client):
    token = register_ok(client, "admin@a.com", "Tenant A")["tokens"]["access_token"]
    cust = make_customer(client, token)
    return token, cust, make_appointment(client, token, cust["id"])


def _resched(client, token, appt_id, day="2030-02-20", at="14:30", **extra):
    return client.post(f"/api/v1/appointments/{appt_id}/reschedule", headers=auth_headers(token),
                       json={"new_date": day, "new_time": at, **extra})


def test_reschedule_updates_slot_status_and_history(client):
    token, _c, appt = _setup(client)
    resp = _resched(client, token, appt["id"], reason="Customer request")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert (data["appointment_date"], data["appointment_time"], data["status"]) == (
        "2030-02-20", "14:30:00", "rescheduled")
    entry = client.get(f"/api/v1/appointments/{appt['id']}/history",
                       headers=auth_headers(token)).json()["data"][-1]
    assert entry["action"] == "rescheduled" and entry["reason"] == "Customer request"
    assert (entry["old_date"], entry["old_time"]) == ("2030-01-15", "10:00:00")
    assert (entry["new_date"], entry["new_time"]) == ("2030-02-20", "14:30:00")
    assert (entry["old_status"], entry["new_status"]) == ("scheduled", "rescheduled")


def test_can_reschedule_more_than_once_and_history_keeps_every_move(client):
    token, _c, appt = _setup(client)
    assert _resched(client, token, appt["id"], "2030-02-20").status_code == 200
    assert _resched(client, token, appt["id"], "2030-03-20").status_code == 200
    hist = client.get(f"/api/v1/appointments/{appt['id']}/history", headers=auth_headers(token)).json()["data"]
    assert [e["action"] for e in hist] == ["created", "rescheduled", "rescheduled"]


def test_reschedule_to_past_rejected(client):
    token, _c, appt = _setup(client)
    resp = _resched(client, token, appt["id"], "2020-01-01")
    assert resp.status_code == 422 and resp.json()["error_code"] == "APPOINTMENT_IN_PAST"


def test_reschedule_to_same_slot_rejected(client):
    token, _c, appt = _setup(client)
    resp = _resched(client, token, appt["id"], "2030-01-15", "10:00")
    assert resp.status_code == 422 and resp.json()["error_code"] == "RESCHEDULE_NO_CHANGE"


def test_reschedule_into_customers_existing_slot_conflicts(client):
    token, cust, appt = _setup(client)
    make_appointment(client, token, cust["id"], "2030-02-20", "14:30")
    resp = _resched(client, token, appt["id"])
    assert resp.status_code == 409 and resp.json()["error_code"] == "APPOINTMENT_CONFLICT"


def test_cannot_reschedule_cancelled_or_completed(client, db):
    token, cust, appt = _setup(client)
    done = make_appointment(client, token, cust["id"], "2030-04-01")
    client.post(f"/api/v1/appointments/{appt['id']}/cancel", headers=auth_headers(token))
    db.get(Appointment, done["id"]).status = AppointmentStatus.COMPLETED
    db.commit()
    r1, r2 = _resched(client, token, appt["id"]), _resched(client, token, done["id"])
    assert r1.status_code == 409 and r1.json()["error_code"] == "APPOINTMENT_ALREADY_CANCELLED"
    assert r2.status_code == 409 and r2.json()["error_code"] == "APPOINTMENT_ALREADY_COMPLETED"


def test_reschedule_validation_and_unknown_appointment(client):
    token, _c, appt = _setup(client)
    h = auth_headers(token)
    url = f"/api/v1/appointments/{appt['id']}/reschedule"
    assert client.post(url, headers=h, json={}).status_code == 422
    assert client.post(url, headers=h, json={"new_date": "nope", "new_time": "10:00"}).status_code == 422
    assert client.post(url, headers=h, json={"new_date": "2030-05-05", "new_time": "10:00+01:00"}).status_code == 422
    assert _resched(client, token, 99999).status_code == 404


def test_staff_can_reschedule(client):
    token, _c, appt = _setup(client)
    create_staff(client, token, "staff@a.com")
    assert _resched(client, login_token(client, "staff@a.com"), appt["id"]).status_code == 200


def test_client_timezone_can_be_set_and_is_validated(client):
    token, _c, _a = _setup(client)
    h = auth_headers(token)
    ok = client.patch("/api/v1/clients/me", headers=h, json={"timezone": "Asia/Kolkata"})
    assert ok.status_code == 200 and ok.json()["data"]["timezone"] == "Asia/Kolkata"
    bad = client.patch("/api/v1/clients/me", headers=h, json={"timezone": "Mars/Base"})
    assert bad.status_code == 422
    # null must not wipe NOT NULL columns
    nulls = client.patch("/api/v1/clients/me", headers=h, json={"timezone": None, "business_name": None})
    assert nulls.status_code == 200 and nulls.json()["data"]["business_name"] == "Tenant A"


def test_creating_appointment_in_the_past_is_rejected(client):
    token, cust, _a = _setup(client)
    resp = client.post("/api/v1/appointments", headers=auth_headers(token), json={
        "customer_id": cust["id"], "appointment_date": "2020-01-01", "appointment_time": "10:00"})
    assert resp.status_code == 422 and resp.json()["error_code"] == "APPOINTMENT_IN_PAST"
