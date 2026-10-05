"""Appointment business rules shared by update, cancel and reschedule."""
from app.core.exceptions import ConflictError
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus as S

# current status -> statuses it may be moved to through a plain update
ALLOWED_STATUS_CHANGES: dict[S, set[S]] = {
    S.SCHEDULED: {S.SCHEDULED, S.CONFIRMED, S.COMPLETED},
    S.CONFIRMED: {S.CONFIRMED, S.SCHEDULED, S.COMPLETED},
    S.RESCHEDULED: {S.RESCHEDULED, S.SCHEDULED, S.CONFIRMED, S.COMPLETED},
    S.COMPLETED: {S.COMPLETED},
    S.CANCELLED: set(),
}


def ensure_not_cancelled(appointment: Appointment) -> None:
    if appointment.status == S.CANCELLED:
        raise ConflictError("Cancelled appointments cannot be modified",
                            error_code="APPOINTMENT_NOT_EDITABLE")


def ensure_status_change_allowed(current: S, target: S) -> None:
    if target not in ALLOWED_STATUS_CHANGES[current]:
        raise ConflictError(f"Cannot change status from {current.value} to {target.value}",
                            error_code="INVALID_STATUS_TRANSITION")


def ensure_open(appointment: Appointment) -> None:
    """Only appointments that are still upcoming can be cancelled or rescheduled."""
    if appointment.status == S.CANCELLED:
        raise ConflictError("Appointment is already cancelled",
                            error_code="APPOINTMENT_ALREADY_CANCELLED")
    if appointment.status == S.COMPLETED:
        raise ConflictError("Appointment is already completed",
                            error_code="APPOINTMENT_ALREADY_COMPLETED")


def ensure_not_in_past(day, at, tz_name: str) -> None:
    from app.core.exceptions import UnprocessableError
    from app.utils.helpers import is_in_past

    if is_in_past(day, at, tz_name):
        raise UnprocessableError("Appointment date and time cannot be in the past",
                                 error_code="APPOINTMENT_IN_PAST")
