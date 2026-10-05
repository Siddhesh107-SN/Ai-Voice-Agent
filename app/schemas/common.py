"""Standard response envelopes."""
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None


class Pagination(BaseModel):
    page: int
    limit: int
    total: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: Pagination


class FieldError(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: str
    errors: list[FieldError] | None = None
