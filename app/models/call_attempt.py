from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import JsonType


class CallAttempt(Base):
    __tablename__ = "call_attempts"
    __table_args__ = (
        UniqueConstraint("attempt_id", name="uq_call_attempts_attempt_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[str] = mapped_column(String(255), nullable=False)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"))
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    duration: Mapped[float | None] = mapped_column(Float)
    interaction_id: Mapped[str | None] = mapped_column(String(255))
    failure_reason: Mapped[str | None] = mapped_column(Text)
    final_agent_variables: Mapped[dict | None] = mapped_column(JsonType)
    interaction_transcript: Mapped[list | None] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
