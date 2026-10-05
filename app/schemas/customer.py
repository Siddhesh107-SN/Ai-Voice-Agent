from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.utils.validators import normalize_phone


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    name: str
    phone: str
    email: str | None
    created_at: datetime
    updated_at: datetime


class CustomerSummary(BaseModel):
    """Compact customer info embedded in other resources."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str


class CustomerCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    phone: str
    email: EmailStr | None = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        return v.lower() if v else v


class CustomerUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        return normalize_phone(v) if v is not None else v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        return v.lower() if v else v
