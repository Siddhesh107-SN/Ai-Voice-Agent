from datetime import date, time

from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment, AppointmentHistory
from app.models.cancellation import Cancellation
from app.models.enums import AppointmentStatus
from app.repositories.base import TenantRepository


class AppointmentRepository(TenantRepository[Appointment]):
    model = Appointment

    def _select(self):
        # selectinload keeps the count query in `list` free of joins.
        return super()._select().options(selectinload(Appointment.customer))

    def get_for_update(self, appointment_id: int) -> Appointment | None:
        """Row-locking read, so concurrent cancel/reschedule calls are serialized."""
        return self.db.scalar(
            super()._select().where(Appointment.id == appointment_id).with_for_update())

    def find_active_for_customer(self, customer_id: int, day: date,
                                 at: time | None = None) -> list[Appointment]:
        active = (AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED,
                  AppointmentStatus.RESCHEDULED)
        query = self._select().where(Appointment.customer_id == customer_id,
                                     Appointment.appointment_date == day,
                                     Appointment.status.in_(active))
        if at is not None:
            query = query.where(Appointment.appointment_time == at)
        return list(self.db.scalars(query.order_by(Appointment.appointment_time)).all())

    def has_active_at(self, customer_id: int, day: date, at: time,
                      exclude_id: int | None = None) -> bool:
        """True if the customer already has a non-cancelled appointment at that slot."""
        query = select(func.count()).select_from(Appointment).where(
            Appointment.client_id == self.client_id,
            Appointment.customer_id == customer_id,
            Appointment.appointment_date == day,
            Appointment.appointment_time == at,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        if exclude_id is not None:
            query = query.where(Appointment.id != exclude_id)
        return (self.db.scalar(query) or 0) > 0

    def add_history(self, **fields) -> AppointmentHistory:
        entry = AppointmentHistory(client_id=self.client_id, **fields)
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_history(self, appointment_id: int) -> list[AppointmentHistory]:
        query = select(AppointmentHistory).where(
            AppointmentHistory.client_id == self.client_id,
            AppointmentHistory.appointment_id == appointment_id,
        ).order_by(AppointmentHistory.id)
        return list(self.db.scalars(query).all())

    def delete_with_history(self, appointment: Appointment) -> None:
        self.db.execute(delete(AppointmentHistory).where(
            AppointmentHistory.client_id == self.client_id,
            AppointmentHistory.appointment_id == appointment.id))
        self.db.execute(delete(Cancellation).where(
            Cancellation.client_id == self.client_id,
            Cancellation.appointment_id == appointment.id))
        self.delete(appointment)
