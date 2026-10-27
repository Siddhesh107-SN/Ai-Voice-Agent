from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AccessStatus, OnboardingStage, UserRole
from app.utils.validators import validate_password_strength


class UserOut(BaseModel):
    """Public user representation. Never includes password_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int | None
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    access_status: AccessStatus | None = None
    onboarding_stage: OnboardingStage | None = None
    email_verified: bool = False
    is_protected: bool = False


class UserCreate(BaseModel):
    """Create a user inside the caller's own client. SUPER_ADMIN cannot be created here."""

    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str
    role: Literal[UserRole.CLIENT_ADMIN, UserRole.CLIENT_STAFF] = UserRole.CLIENT_STAFF

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.lower()


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = None
    role: Literal[UserRole.CLIENT_ADMIN, UserRole.CLIENT_STAFF] | None = None
    is_active: bool | None = None
    is_protected: bool | None = None
    is_verified: bool | None = None
