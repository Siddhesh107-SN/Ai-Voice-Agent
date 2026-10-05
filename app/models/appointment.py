from datetime import date, datetime, time

from sqlalchemy import (Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, String, Text,
                        Time, UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import AppointmentAction, AppointmentStatus, ChangeSource


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("client_id", "id", name="uq_appointments_client_id_id"),
        # DB-level tenant guard: the customer must belong to the same client.
        ForeignKeyConstraint(
            ["client_id", "customer_id"], ["customers.client_id", "customers.id"],
            name="fk_appointments_client_customer",
        ),
        Index("ix_appointments_client_date", "client_id", "appointment_date"),
        Index("ix_appointments_client_status", "client_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        str_enum(AppointmentStatus, "appointment_status"),
        default=AppointmentStatus.SCHEDULED, nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)

    customer = relationship("Customer", viewonly=True)
    history = relationship("AppointmentHistory", back_populates="appointment",
                           order_by="AppointmentHistory.id")


class AppointmentHistory(Base):
    """Append-only audit trail of appointment changes (cancellations, reschedules)."""

    __tablename__ = "appointment_history"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "appointment_id"], ["appointments.client_id", "appointments.id"],
            name="fk_appt_history_client_appointment",
        ),
        Index("ix_appt_history_client_appt", "client_id", "appointment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    appointment_id: Mapped[int] = mapped_column(nullable=False)
    action: Mapped[AppointmentAction] = mapped_column(
        str_enum(AppointmentAction, "appointment_action"), nullable=False
    )
    source: Mapped[ChangeSource] = mapped_column(
        str_enum(ChangeSource, "change_source"), default=ChangeSource.USER, nullable=False
    )
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    old_date: Mapped[date | None] = mapped_column(Date)
    old_time: Mapped[time | None] = mapped_column(Time)
    new_date: Mapped[date | None] = mapped_column(Date)
    new_time: Mapped[time | None] = mapped_column(Time)
    old_status: Mapped[str | None] = mapped_column(String(32))
    new_status: Mapped[str | None] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    appointment = relationship("Appointment", back_populates="history", viewonly=False)
