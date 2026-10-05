from datetime import date, datetime, time

from sqlalchemy import (Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Text, Time,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import str_enum
from app.models.enums import ChangeSource


class Cancellation(Base):
    """One row per cancelled appointment, keeping a snapshot of the slot that was cancelled."""

    __tablename__ = "cancellations"
    __table_args__ = (
        UniqueConstraint("client_id", "appointment_id", name="uq_cancellations_client_appointment"),
        ForeignKeyConstraint(
            ["client_id", "appointment_id"], ["appointments.client_id", "appointments.id"],
            name="fk_cancellations_client_appointment",
        ),
        ForeignKeyConstraint(
            ["client_id", "customer_id"], ["customers.client_id", "customers.id"],
            name="fk_cancellations_client_customer",
        ),
        Index("ix_cancellations_client_created", "client_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    appointment_id: Mapped[int] = mapped_column(nullable=False)
    customer_id: Mapped[int] = mapped_column(nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    appointment_time: Mapped[time] = mapped_column(Time, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    source: Mapped[ChangeSource] = mapped_column(
        str_enum(ChangeSource, "change_source"), default=ChangeSource.USER, nullable=False
    )
    cancelled_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    customer = relationship("Customer", viewonly=True)
