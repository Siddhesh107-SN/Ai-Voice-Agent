from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import ClientStatus
from app.utils.validators import validate_password_strength, validate_timezone


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    email: str
    phone: str | None
    address: str | None
    timezone: str
    status: ClientStatus
    created_at: datetime
    updated_at: datetime


class ClientAdminInit(BaseModel):
    """First CLIENT_ADMIN created together with a client."""

    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.lower()


class ClientCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=1000)
    timezone: str | None = None
    admin: ClientAdminInit

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str | None) -> str | None:
        return validate_timezone(v) if v else v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.lower()


class ClientProfileUpdate(BaseModel):
    """What a client may change about itself. Email and status are deliberately absent."""

    business_name: str | None = Field(default=None, min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=1000)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str | None) -> str | None:
        return validate_timezone(v) if v else v


class ClientUpdate(ClientProfileUpdate):
    """What SUPER_ADMIN may change (status has its own enable/disable endpoints)."""

    email: EmailStr | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        return v.lower() if v else v
