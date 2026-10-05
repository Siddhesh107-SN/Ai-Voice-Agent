"""Base class for repositories of tenant-owned tables.

Every query is filtered by `client_id`, and `add` forces it, so a service that uses
this class cannot read or write another tenant's rows by accident.
"""
from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class TenantRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: Session, client_id: int) -> None:
        if client_id is None:
            raise ValueError("A tenant repository requires a client_id")
        self.db = db
        self.client_id = client_id

    def _select(self):
        return select(self.model).where(self.model.client_id == self.client_id)  # type: ignore[attr-defined]

    def get(self, obj_id: int) -> ModelT | None:
        """Returns None both when the row doesn't exist and when it belongs to another tenant."""
        return self.db.scalar(self._select().where(self.model.id == obj_id))  # type: ignore[attr-defined]

    def list(self, *, offset: int, limit: int, filters: Sequence[Any] = (),
             order_by: Any = None) -> tuple[list[ModelT], int]:
        query = self._select().where(*filters)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        if order_by is None:
            ordering = [self.model.id]  # type: ignore[attr-defined]
        else:
            ordering = list(order_by) if isinstance(order_by, (list, tuple)) else [order_by]
        items = self.db.scalars(query.order_by(*ordering).offset(offset).limit(limit)).all()
        return list(items), total

    def add(self, obj: ModelT) -> ModelT:
        obj.client_id = self.client_id  # type: ignore[attr-defined]  # never trust caller input
        self.db.add(obj)
        self.db.flush()
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.flush()
