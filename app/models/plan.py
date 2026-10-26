from datetime import datetime

from sqlalchemy import (Boolean, DateTime, ForeignKey, Index, Integer, String,
                        Text, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import str_enum
from app.models.enums import BillingCycle, PlanKey, SubscriptionStatus


class Plan(Base):
    """Platform subscription tiers (Starter, Growth, Business, Enterprise)."""

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    monthly_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # in rupees
    yearly_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # in rupees
    included_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_call_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    """Client subscription to a plan. One active subscription per client."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_client_status", "client_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True, nullable=False)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        str_enum(BillingCycle, "billing_cycle"), default=BillingCycle.MONTHLY, nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        str_enum(SubscriptionStatus, "subscription_status"), default=SubscriptionStatus.ACTIVE, nullable=False
    )
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    renews_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    client = relationship("Client")
    plan = relationship("Plan", back_populates="subscriptions")


class MinutePack(Base):
    """Top-up minute packs added to a client's billing balance."""

    __tablename__ = "minute_packs"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True, nullable=False)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    added_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    client = relationship("Client")
    added_by_user = relationship("User")
