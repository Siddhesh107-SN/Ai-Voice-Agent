"""Read access to call history.

CLIENT_ADMIN / CLIENT_STAFF only ever get a tenant-scoped repository. SUPER_ADMIN gets the
platform repository (optionally narrowed to one client). The choice is made once, here.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.call import Call
from app.models.enums import CallDirection, CallStatus, UserRole
from app.models.user import User
from app.repositories.call_repository import (NEWEST_FIRST, CallRepository,
                                              PlatformCallRepository, call_filters)
from app.repositories.client_repository import ClientRepository
from app.schemas.call import CallDetail
from app.utils.helpers import day_bounds_utc


class CallService:
    def __init__(self, db: Session, user: User, platform_client_id: int | None = None) -> None:
        self.user = user
        if user.role == UserRole.SUPER_ADMIN:
            self.repo = PlatformCallRepository(db, platform_client_id)
            self.timezone = "UTC"  # platform-wide date filters use UTC
        else:
            self.repo = CallRepository(db, user.client_id)
            client = ClientRepository(db).get_by_id(user.client_id)
            self.timezone = client.timezone if client else "UTC"

    def list(self, offset: int, limit: int, *, status: CallStatus | None,
             agent_id: int | None, customer_id: int | None, direction: CallDirection | None,
             day: date | None, date_from: date | None, date_to: date | None
             ) -> tuple[list[Call], int]:
        start = end = None
        if day is not None:
            start, end = day_bounds_utc(day, self.timezone)
        if date_from is not None:
            lower = day_bounds_utc(date_from, self.timezone)[0]
            start = max(start, lower) if start else lower
        if date_to is not None:
            upper = day_bounds_utc(date_to, self.timezone)[1]
            end = min(end, upper) if end else upper
        filters = call_filters(status=status, agent_id=agent_id, customer_id=customer_id,
                               direction=direction, start=start, end=end)
        return self.repo.list(offset=offset, limit=limit, filters=filters, order_by=NEWEST_FIRST)

    def get(self, call_id: int) -> Call:
        call = self.repo.get(call_id)
        if call is None:
            raise NotFoundError("Call not found", error_code="CALL_NOT_FOUND")
        return call

    def detail(self, call_id: int) -> CallDetail:
        """Staff get call metadata only; transcripts and recordings need CLIENT_ADMIN."""
        call = self.get(call_id)
        detail = CallDetail.model_validate(call)
        if self.user.role == UserRole.CLIENT_STAFF:
            return detail.model_copy(update={"transcript": None, "recording_url": None})
        return detail
