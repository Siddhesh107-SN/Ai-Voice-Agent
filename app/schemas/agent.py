from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AgentStatus
from app.utils.validators import normalize_phone


class AgentSummary(BaseModel):
    """Compact agent info embedded in other resources (calls)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AgentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    name: str
    description: str | None
    phone_number: str | None
    provider: str
    provider_agent_id: str | None
    configuration: dict[str, Any]
    status: AgentStatus
    created_at: datetime
    updated_at: datetime


class AgentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    phone_number: str | None = None
    provider: str = Field(default="sarvam", min_length=1, max_length=50)
    provider_agent_id: str | None = Field(default=None, max_length=255)
    configuration: dict[str, Any] = Field(default_factory=dict)

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        return normalize_phone(v) if v is not None else v


class AgentUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    phone_number: str | None = None
    provider: str | None = Field(default=None, min_length=1, max_length=50)
    provider_agent_id: str | None = Field(default=None, max_length=255)
    configuration: dict[str, Any] | None = None
    status: AgentStatus | None = None

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        return normalize_phone(v) if v is not None else v
