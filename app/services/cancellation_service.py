"""Cancellation workflow: validate -> status=cancelled -> cancellation row -> history + audit."""
from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.appointment import Appointment
from app.models.cancellation import Cancellation
from app.models.enums import AppointmentAction, AppointmentStatus, ChangeSource
from app.models.user import User
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.cancellation_repository import CancellationRepository
from app.services.appointment_rules import ensure_open
from app.services.audit_service import record_audit
from app.services.transactions import commit_or_conflict


class CancellationService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.appointments = AppointmentRepository(db, tenant_id)
        self.cancellations = CancellationRepository(db, tenant_id)

    def cancel(self, appointment_id: int, reason: str | None, *, actor: User | None,
               source: ChangeSource = ChangeSource.USER, ip: str | None = None) -> Appointment:
        appointment = self.appointments.get_for_update(appointment_id)
        if appointment is None:
            raise NotFoundError("Appointment not found", error_code="APPOINTMENT_NOT_FOUND")
        ensure_open(appointment)

        old_status = appointment.status
        appointment.status = AppointmentStatus.CANCELLED
        actor_id = actor.id if actor else None
        self.cancellations.add(Cancellation(
            appointment_id=appointment.id, customer_id=appointment.customer_id,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            reason=reason, source=source, cancelled_by_user_id=actor_id))
        self.appointments.add_history(
            appointment_id=appointment.id, action=AppointmentAction.CANCELLED, source=source,
            actor_user_id=actor_id, old_date=appointment.appointment_date,
            old_time=appointment.appointment_time, old_status=old_status.value,
            new_status=AppointmentStatus.CANCELLED.value, reason=reason)
        # `reason` is free text from customers, so it is kept out of the audit log.
        record_audit(self.db, "appointment.cancel", user_id=actor_id, client_id=self.tenant_id,
                     entity_type="appointment", entity_id=appointment.id,
                     details={"source": source.value}, ip_address=ip)
        commit_or_conflict(self.db, "Appointment is already cancelled",
                           "APPOINTMENT_ALREADY_CANCELLED")
        return self.appointments.get(appointment_id)

    def list(self, offset: int, limit: int, *, customer_id: int | None,
             source: ChangeSource | None, date_from: date | None,
             date_to: date | None) -> tuple[list[Cancellation], int]:
        filters = []
        if customer_id is not None:
            filters.append(Cancellation.customer_id == customer_id)
        if source is not None:
            filters.append(Cancellation.source == source)
        if date_from is not None:
            filters.append(Cancellation.appointment_date >= date_from)
        if date_to is not None:
            filters.append(Cancellation.appointment_date <= date_to)
        return self.cancellations.list(offset=offset, limit=limit, filters=filters,
                                       order_by=[Cancellation.id.desc()])

    def get(self, cancellation_id: int) -> Cancellation:
        cancellation = self.cancellations.get(cancellation_id)
        if cancellation is None:
            raise NotFoundError("Cancellation not found", error_code="CANCELLATION_NOT_FOUND")
        return cancellation
