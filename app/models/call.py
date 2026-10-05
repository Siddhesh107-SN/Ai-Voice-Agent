from datetime import datetime

from sqlalchemy import (DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import str_enum
from app.models.enums import CallDirection, CallStatus


class Call(Base):
    __tablename__ = "calls"
    __table_args__ = (
        UniqueConstraint("client_id", "id", name="uq_calls_client_id_id"),
        # Idempotency: one row per provider call, per tenant.
        UniqueConstraint("client_id", "provider_call_id", name="uq_calls_client_provider_call"),
        ForeignKeyConstraint(
            ["client_id", "agent_id"], ["agents.client_id", "agents.id"],
            name="fk_calls_client_agent",
        ),
        ForeignKeyConstraint(
            ["client_id", "customer_id"], ["customers.client_id", "customers.id"],
            name="fk_calls_client_customer",
        ),
        Index("ix_calls_client_started", "client_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    agent_id: Mapped[int | None] = mapped_column()
    customer_id: Mapped[int | None] = mapped_column()
    provider_call_id: Mapped[str | None] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    direction: Mapped[CallDirection] = mapped_column(
        str_enum(CallDirection, "call_direction"), nullable=False
    )
    status: Mapped[CallStatus] = mapped_column(
        str_enum(CallStatus, "call_status"), default=CallStatus.INITIATED, nullable=False
    )
    duration: Mapped[int | None] = mapped_column(Integer)  # seconds
    recording_url: Mapped[str | None] = mapped_column(Text)
    transcript: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    @property
    def has_recording(self) -> bool:
        return bool(self.recording_url)

    @property
    def has_transcript(self) -> bool:
        return bool(self.transcript)

    agent = relationship("Agent", viewonly=True)
    customer = relationship("Customer", viewonly=True)
