from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import UserRole


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        # SUPER_ADMIN has no tenant; every other role must belong to one.
        CheckConstraint(
            "(role = 'super_admin' AND client_id IS NULL) OR "
            "(role <> 'super_admin' AND client_id IS NOT NULL)",
            name="ck_users_role_client",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(str_enum(UserRole, "user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    client = relationship("Client", back_populates="users")
