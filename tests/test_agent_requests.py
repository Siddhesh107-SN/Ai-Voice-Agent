"""AI-agent initiated cancel/reschedule: the backend verifies before changing anything."""
import pytest
from sqlalchemy import select

from app.core.exceptions import AppError
from app.models.appointment import Appointment
from app.models.audit_log import AuditLog
from app.models.cancellation import Cancellation
from app.models.enums import AppointmentStatus, ChangeSource
from app.services.agent_request_service import AgentRequestService
from datetime import date, time
from tests.helpers import make_appointment, make_customer, register_ok

PHONE = "+919876543210"


@pytest.fixture
def tenant(client):
    data = register_ok(client, "admin@a.com", "Tenant A")
    tok = data["tokens"]["access_token"]
    cust = make_customer(client, tok, "Asha", PHONE)
    appt = make_appointment(client, tok, cust["id"])
    return {"client_id": data["user"]["client_id"], "customer": cust, "appointment": appt, "token": tok}


def svc(db, tenant_id):
    return AgentRequestService(db, tenant_id)


def test_agent_cancels_by_phone_and_appointment_id(db, tenant):
    appt = svc(db, tenant["client_id"]).cancel(
        customer_phone="+91 98765 43210", appointment_id=tenant["appointment"]["id"], reason="asked by phone")
    assert appt.status == AppointmentStatus.CANCELLED
    row = db.scalar(select(Cancellation))
    assert row.source == ChangeSource.AI_AGENT and row.cancelled_by_user_id is None
    log = db.scalar(select(AuditLog).where(AuditLog.action == "appointment.cancel"))
    assert log.user_id is None and log.details == {"source": "ai_agent"}


def test_agent_can_identify_appointment_by_date(db, tenant):
    appt = svc(db, tenant["client_id"]).cancel(customer_phone=PHONE, day=date(2030, 1, 15))
    assert appt.id == tenant["appointment"]["id"] and appt.status == AppointmentStatus.CANCELLED


def test_wrong_phone_for_appointment_is_refused_and_nothing_changes(db, client, tenant):
    other = make_customer(client, tenant["token"], "Bala", "+919000000001")
    with pytest.raises(AppError) as err:
        svc(db, tenant["client_id"]).cancel(customer_phone=other["phone"],
                                            appointment_id=tenant["appointment"]["id"])
    assert err.value.status_code == 404 and err.value.error_code == "APPOINTMENT_NOT_FOUND"
    assert db.get(Appointment, tenant["appointment"]["id"]).status == AppointmentStatus.SCHEDULED
    assert db.scalar(select(Cancellation)) is None


def test_unknown_phone_and_wrong_appointment_give_the_same_error(db, tenant):
    s = svc(db, tenant["client_id"])
    with pytest.raises(AppError) as unknown_phone:
        s.cancel(customer_phone="+919111111111", appointment_id=tenant["appointment"]["id"])
    with pytest.raises(AppError) as unknown_appt:
        s.cancel(customer_phone=PHONE, appointment_id=99999)
    assert (unknown_phone.value.status_code, unknown_phone.value.error_code, unknown_phone.value.message) == \
           (unknown_appt.value.status_code, unknown_appt.value.error_code, unknown_appt.value.message)


def test_agent_needs_appointment_id_or_date(db, tenant):
    with pytest.raises(AppError) as err:
        svc(db, tenant["client_id"]).cancel(customer_phone=PHONE)
    assert err.value.error_code == "APPOINTMENT_NOT_IDENTIFIED"


def test_ambiguous_date_requires_time(db, client, tenant):
    make_appointment(client, tenant["token"], tenant["customer"]["id"], "2030-01-15", "16:00")
    s = svc(db, tenant["client_id"])
    with pytest.raises(AppError) as err:
        s.cancel(customer_phone=PHONE, day=date(2030, 1, 15))
    assert err.value.status_code == 409 and err.value.error_code == "AMBIGUOUS_APPOINTMENT"
    assert s.cancel(customer_phone=PHONE, day=date(2030, 1, 15), at=time(16, 0)).status == AppointmentStatus.CANCELLED


def test_invalid_phone_rejected(db, tenant):
    with pytest.raises(AppError) as err:
        svc(db, tenant["client_id"]).cancel(customer_phone="abc", appointment_id=1)
    assert err.value.error_code == "INVALID_PHONE"


def test_agent_reschedule_applies_same_rules_as_users(db, tenant):
    s = svc(db, tenant["client_id"])
    appt = s.reschedule(customer_phone=PHONE, appointment_id=tenant["appointment"]["id"],
                        new_date=date(2030, 3, 3), new_time=time(9, 0, 30))
    assert (appt.appointment_date, appt.appointment_time, appt.status) == (
        date(2030, 3, 3), time(9, 0), AppointmentStatus.RESCHEDULED)
    with pytest.raises(AppError) as past:
        s.reschedule(customer_phone=PHONE, appointment_id=appt.id,
                     new_date=date(2020, 1, 1), new_time=time(9, 0))
    assert past.value.error_code == "APPOINTMENT_IN_PAST"


def test_agent_cannot_touch_already_cancelled_appointment(db, tenant):
    s = svc(db, tenant["client_id"])
    s.cancel(customer_phone=PHONE, appointment_id=tenant["appointment"]["id"])
    with pytest.raises(AppError) as err:
        s.cancel(customer_phone=PHONE, day=date(2030, 1, 15))
    assert err.value.error_code == "APPOINTMENT_NOT_FOUND"  # cancelled ones aren't "active" matches
    with pytest.raises(AppError) as err2:
        s.cancel(customer_phone=PHONE, appointment_id=tenant["appointment"]["id"])
    assert err2.value.error_code == "APPOINTMENT_ALREADY_CANCELLED"


def test_agent_book_rejects_invalid_phone(db, tenant):
    with pytest.raises(AppError) as err:
        svc(db, tenant["client_id"]).book(customer_phone="abc", customer_name="X",
                                          appointment_date=date(2030, 5, 5), appointment_time=time(9, 0))
    assert err.value.error_code == "INVALID_PHONE"
