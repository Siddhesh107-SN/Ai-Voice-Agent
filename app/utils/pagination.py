"""Pagination query params and response builder."""
from dataclasses import dataclass
from typing import Annotated, TypeVar

from fastapi import Depends, Query
from pydantic import BaseModel

from app.schemas.common import PaginatedResponse, Pagination

T = TypeVar("T", bound=BaseModel)


@dataclass(frozen=True)
class PageParams:
    page: int
    limit: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def get_page_params(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, limit=limit)


PageParamsDep = Annotated[PageParams, Depends(get_page_params)]


def paginated(items: list, total: int, params: PageParams,
              schema: type[T]) -> PaginatedResponse[T]:
    return PaginatedResponse[schema](  # type: ignore[valid-type]
        data=[schema.model_validate(i) for i in items],
        pagination=Pagination(page=params.page, limit=params.limit, total=total),
    )
