from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserOut
from app.utils.validators import validate_password_strength, validate_timezone


class RegisterRequest(BaseModel):
    """Creates a new client (tenant) and its first CLIENT_ADMIN user."""

    business_name: str = Field(min_length=2, max_length=200)
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str
    phone: str | None = Field(default=None, max_length=32)
    country_code: str | None = Field(default=None, max_length=16)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str | None) -> str | None:
        return validate_timezone(v) if v else v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.lower()


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token lifetime in seconds


class AuthData(BaseModel):
    user: UserOut
    tokens: TokenPair
