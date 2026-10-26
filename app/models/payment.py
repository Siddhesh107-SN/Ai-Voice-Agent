from datetime import date, datetime

from sqlalchemy import (Boolean, Date, DateTime, ForeignKey, Index, Integer,
                        String, Text, func, text)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import str_enum
from app.models.enums import BillingCycle, PaymentStatus


class Payment(Base):
    """Client manual UPI payments awaiting or completed verification."""

    __tablename__ = "payments"
    __table_args__ = (
        Index("uq_payments_transaction_id_lower", text("lower(transaction_id)"), unique=True),
        Index("ix_payments_client_created", "client_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True, nullable=False)
    plan_key: Mapped[str] = mapped_column(String(32), nullable=False)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        str_enum(BillingCycle, "billing_cycle"), nullable=False
    )
    amount_expected: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(64), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        str_enum(PaymentStatus, "payment_status"),
        default=PaymentStatus.PENDING_VERIFICATION,
        nullable=False,
    )
    amount_mismatch: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    client = relationship("Client")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
