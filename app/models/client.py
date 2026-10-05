from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import ClientStatus


class Client(TimestampMixin, Base):
    """A tenant (business). Its `id` is the client_id on every tenant table."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(
        String(64), default="UTC", server_default="UTC", nullable=False)
    status: Mapped[ClientStatus] = mapped_column(
        str_enum(ClientStatus, "client_status"), default=ClientStatus.ACTIVE, nullable=False
    )

    users = relationship("User", back_populates="client")
    agents = relationship("Agent", back_populates="client")
    customers = relationship("Customer", back_populates="client")
