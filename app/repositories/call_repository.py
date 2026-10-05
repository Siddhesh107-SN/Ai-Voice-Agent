from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.call import Call
from app.models.enums import CallDirection, CallStatus
from app.repositories.base import TenantRepository

# A call's date is when it started; calls that never started fall back to their creation time.
CALL_TIME = func.coalesce(Call.started_at, Call.created_at)
NEWEST_FIRST = [CALL_TIME.desc(), Call.id.desc()]


def call_filters(*, status: CallStatus | None = None, agent_id: int | None = None,
                 customer_id: int | None = None, direction: CallDirection | None = None,
                 start: datetime | None = None, end: datetime | None = None) -> list[Any]:
    """`start` is inclusive, `end` exclusive."""
    filters: list[Any] = []
    if status is not None:
        filters.append(Call.status == status)
    if agent_id is not None:
        filters.append(Call.agent_id == agent_id)
    if customer_id is not None:
        filters.append(Call.customer_id == customer_id)
    if direction is not None:
        filters.append(Call.direction == direction)
    if start is not None:
        filters.append(CALL_TIME >= start)
    if end is not None:
        filters.append(CALL_TIME < end)
    return filters


def _with_related(query):
    return query.options(selectinload(Call.agent), selectinload(Call.customer))


class CallRepository(TenantRepository[Call]):
    """Calls of ONE client (used for CLIENT_ADMIN / CLIENT_STAFF)."""

    model = Call

    def _select(self):
        return _with_related(super()._select())

    def get_by_provider_call_id(self, provider_call_id: str) -> Call | None:
        return self.db.scalar(self._select().where(Call.provider_call_id == provider_call_id))


class PlatformCallRepository:
    """Calls across ALL clients. Only ever constructed for SUPER_ADMIN (see CallService)."""

    def __init__(self, db: Session, client_id: int | None = None) -> None:
        self.db = db
        self.client_id = client_id

    def _select(self):
        query = _with_related(select(Call))
        if self.client_id is not None:
            query = query.where(Call.client_id == self.client_id)
        return query

    def get(self, call_id: int) -> Call | None:
        return self.db.scalar(self._select().where(Call.id == call_id))

    def list(self, *, offset: int, limit: int, filters: Sequence[Any] = (),
             order_by: Sequence[Any] = ()) -> tuple[list[Call], int]:
        query = self._select().where(*filters)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = self.db.scalars(query.order_by(*order_by).offset(offset).limit(limit)).all()
        return list(items), total
