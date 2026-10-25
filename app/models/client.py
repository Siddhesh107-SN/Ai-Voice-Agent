from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import AccessStatus, ClientStatus, OnboardingStage


class Client(TimestampMixin, Base):
    """A tenant (business). Its `id` is the client_id on every tenant table."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    address: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(
        String(64), default="UTC", server_default="UTC", nullable=False)
    status: Mapped[ClientStatus] = mapped_column(
        str_enum(ClientStatus, "client_status"), default=ClientStatus.ACTIVE, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    access_status: Mapped[AccessStatus] = mapped_column(
        str_enum(AccessStatus, "access_status"),
        default=AccessStatus.PENDING_PAYMENT,
        server_default="pending_payment",
        nullable=False,
    )
    onboarding_stage: Mapped[OnboardingStage | None] = mapped_column(
        str_enum(OnboardingStage, "onboarding_stage"),
        default=None,
        nullable=True,
    )

    users = relationship("User", back_populates="client")
    agents = relationship("Agent", back_populates="client")
    customers = relationship("Customer", back_populates="client")
