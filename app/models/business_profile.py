from datetime import time

from sqlalchemy import (Boolean, ForeignKey, Index, Integer, String, Time,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JsonType


class BusinessHour(Base):
    """Weekly opening hours for a client tenant (weekday 0=Mon to 6=Sun)."""

    __tablename__ = "business_hours"
    __table_args__ = (
        UniqueConstraint("client_id", "weekday", name="uq_business_hours_client_weekday"),
        Index("ix_business_hours_client_id", "client_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon ... 6=Sun
    open_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    client = relationship("Client")


class Service(Base):
    """Catalog of business services offered by the client."""

    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint("client_id", "name", name="uq_services_client_name"),
        Index("ix_services_client_id", "client_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    client = relationship("Client")


class StaffMember(Base):
    """Staff profiles and their 7-day availability flags (Mon-Sun)."""

    __tablename__ = "staff_members"
    __table_args__ = (
        Index("ix_staff_members_client_id", "client_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    available_days: Mapped[list[bool]] = mapped_column(
        JsonType, default=lambda: [True] * 7, nullable=False
    )

    client = relationship("Client")
