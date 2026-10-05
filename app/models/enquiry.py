from sqlalchemy import ForeignKey, ForeignKeyConstraint, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import EnquiryStatus


class Enquiry(TimestampMixin, Base):
    __tablename__ = "enquiries"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "customer_id"], ["customers.client_id", "customers.id"],
            name="fk_enquiries_client_customer",
        ),
        Index("ix_enquiries_client_status", "client_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column()
    question: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[str | None] = mapped_column(Text)
    status: Mapped[EnquiryStatus] = mapped_column(
        str_enum(EnquiryStatus, "enquiry_status"), default=EnquiryStatus.OPEN, nullable=False
    )

    customer = relationship("Customer", viewonly=True)
