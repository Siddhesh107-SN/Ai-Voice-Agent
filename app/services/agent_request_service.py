"""Requests made on behalf of a customer by the AI calling agent.

The agent is NOT trusted to name arbitrary records. Every request must identify the customer
(by phone number) AND an appointment that belongs to that customer within the tenant; anything
else fails with the same generic "not found", so the agent can't probe for other records.
"""
from __future__ import annotations

from datetime import date, time

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, UnprocessableError
from app.schemas.appointment import AppointmentCreate
from app.models.appointment import Appointment
from app.models.enums import ChangeSource
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.customer_repository import CustomerRepository
from app.services.appointment_service import AppointmentService
from app.services.cancellation_service import CancellationService
from app.services.customer_service import CustomerService
from app.services.reschedule_service import RescheduleService
from app.utils.validators import normalize_phone

_NOT_FOUND = ("No matching appointment found for this customer", "APPOINTMENT_NOT_FOUND")


class AgentRequestService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.appointments = AppointmentRepository(db, tenant_id)
        self.customers = CustomerRepository(db, tenant_id)

    def _verify(self, customer_phone: str, appointment_id: int | None,
                day: date | None, at: time | None) -> Appointment:
        try:
            phone = normalize_phone(customer_phone)
        except ValueError as exc:
            raise UnprocessableError("Invalid customer phone number",
                                     error_code="INVALID_PHONE") from exc
        customer = self.customers.get_by_phone(phone)
        if customer is None:
            raise NotFoundError(_NOT_FOUND[0], error_code=_NOT_FOUND[1])

        if appointment_id is not None:
            appointment = self.appointments.get(appointment_id)
            if appointment is None or appointment.customer_id != customer.id:
                raise NotFoundError(_NOT_FOUND[0], error_code=_NOT_FOUND[1])
            return appointment

        if day is None:
            raise UnprocessableError("Provide an appointment_id or the appointment date",
                                     error_code="APPOINTMENT_NOT_IDENTIFIED")
        matches = self.appointments.find_active_for_customer(customer.id, day, at)
        if not matches:
            raise NotFoundError(_NOT_FOUND[0], error_code=_NOT_FOUND[1])
        if len(matches) > 1:
            raise ConflictError("Several appointments match; please specify the time",
                                error_code="AMBIGUOUS_APPOINTMENT")
        return matches[0]

    def cancel(self, *, customer_phone: str, appointment_id: int | None = None,
               day: date | None = None, at: time | None = None,
               reason: str | None = None) -> Appointment:
        appointment = self._verify(customer_phone, appointment_id, day, at)
        return CancellationService(self.db, self.tenant_id).cancel(
            appointment.id, reason, actor=None, source=ChangeSource.AI_AGENT)

    def reschedule(self, *, customer_phone: str, new_date: date, new_time: time,
                   appointment_id: int | None = None, day: date | None = None,
                   at: time | None = None, reason: str | None = None) -> Appointment:
        appointment = self._verify(customer_phone, appointment_id, day, at)
        return RescheduleService(self.db, self.tenant_id).reschedule(
            appointment.id, new_date, new_time.replace(second=0, microsecond=0), reason,
            actor=None, source=ChangeSource.AI_AGENT)


    def book(self, *, customer_phone: str, customer_name: str | None, appointment_date: date,
             appointment_time: time, notes: str | None = None) -> Appointment:
        """Books a new appointment for a caller, creating the customer if this is their
        first contact. Unlike cancel/reschedule, there is no existing record to verify
        against — the customer is identified purely by phone number."""
        try:
            phone = normalize_phone(customer_phone)
        except ValueError as exc:
            raise UnprocessableError("Invalid customer phone number",
                                     error_code="INVALID_PHONE") from exc
        customer = CustomerService(self.db, self.tenant_id).get_or_create_by_phone(
            phone, customer_name, source="customer.create_via_agent")
        data = AppointmentCreate(customer_id=customer.id, appointment_date=appointment_date,
                                 appointment_time=appointment_time, notes=notes)
        return AppointmentService(self.db, self.tenant_id).create(
            data, actor=None, ip=None, source=ChangeSource.AI_AGENT)

    def check_slot(self, *, customer_phone: str, appointment_date: date,
                   appointment_time: time) -> bool:
        try:
            phone = normalize_phone(customer_phone)
        except ValueError as exc:
            raise UnprocessableError("Invalid customer phone number",
                                     error_code="INVALID_PHONE") from exc
        customer = self.customers.get_by_phone(phone)
        if customer is not None:
            return not self.appointments.has_active_at(
                customer.id, appointment_date, appointment_time)
        return True
