from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import AccessStatus, OnboardingStage, UserRole


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
    is_protected: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


    client = relationship("Client", back_populates="users", lazy="joined")

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def access_status(self) -> AccessStatus | None:
        return self.client.access_status if self.client is not None else None

    @property
    def onboarding_stage(self) -> OnboardingStage | None:
        return self.client.onboarding_stage if self.client is not None else None
