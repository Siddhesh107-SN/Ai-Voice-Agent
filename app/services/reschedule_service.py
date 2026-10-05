"""Rescheduling workflow with validation and an audit trail."""
from __future__ import annotations

from datetime import date, time

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, UnprocessableError
from app.models.appointment import Appointment
from app.models.enums import AppointmentAction, AppointmentStatus, ChangeSource
from app.models.user import User
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.client_repository import ClientRepository
from app.services.appointment_rules import ensure_not_in_past, ensure_open
from app.services.audit_service import record_audit
from app.services.transactions import commit_or_conflict

_SLOT_TAKEN = "This customer already has an appointment at that date and time"


class RescheduleService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.appointments = AppointmentRepository(db, tenant_id)

    def reschedule(self, appointment_id: int, new_date: date, new_time: time,
                   reason: str | None, *, actor: User | None,
                   source: ChangeSource = ChangeSource.USER, ip: str | None = None) -> Appointment:
        appointment = self.appointments.get_for_update(appointment_id)
        if appointment is None:
            raise NotFoundError("Appointment not found", error_code="APPOINTMENT_NOT_FOUND")
        ensure_open(appointment)

        if (new_date, new_time) == (appointment.appointment_date, appointment.appointment_time):
            raise UnprocessableError("The new date and time must differ from the current ones",
                                     error_code="RESCHEDULE_NO_CHANGE")
        client = ClientRepository(self.db).get_by_id(self.tenant_id)
        ensure_not_in_past(new_date, new_time, client.timezone if client else "UTC")
        if self.appointments.has_active_at(appointment.customer_id, new_date, new_time,
                                           exclude_id=appointment.id):
            raise ConflictError(_SLOT_TAKEN, error_code="APPOINTMENT_CONFLICT")

        old_date, old_time, old_status = (appointment.appointment_date,
                                          appointment.appointment_time, appointment.status)
        appointment.appointment_date, appointment.appointment_time = new_date, new_time
        appointment.status = AppointmentStatus.RESCHEDULED
        actor_id = actor.id if actor else None
        self.appointments.add_history(
            appointment_id=appointment.id, action=AppointmentAction.RESCHEDULED, source=source,
            actor_user_id=actor_id, old_date=old_date, old_time=old_time, new_date=new_date,
            new_time=new_time, old_status=old_status.value,
            new_status=AppointmentStatus.RESCHEDULED.value, reason=reason)
        record_audit(self.db, "appointment.reschedule", user_id=actor_id,
                     client_id=self.tenant_id, entity_type="appointment",
                     entity_id=appointment.id, details={"source": source.value}, ip_address=ip)
        commit_or_conflict(self.db, _SLOT_TAKEN, "APPOINTMENT_CONFLICT")
        return self.appointments.get(appointment_id)
