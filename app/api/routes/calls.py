from datetime import date

from fastapi import APIRouter, Query

from app.core.dependencies import AnyRoleUser, DbSession
from app.models.enums import CallDirection, CallStatus, UserRole
from app.schemas.call import CallDetail, CallListItem
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.call_service import CallService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CallListItem])
def list_calls(
    user: AnyRoleUser, db: DbSession, page: PageParamsDep,
    status_filter: CallStatus | None = Query(None, alias="status"),
    agent_id: int | None = Query(None, alias="agent"),
    customer_id: int | None = Query(None, alias="customer"),
    direction: CallDirection | None = None,
    day: date | None = Query(None, alias="date", description="Calendar day (client timezone)"),
    date_from: date | None = None, date_to: date | None = None,
    client_id: int | None = Query(None, description="SUPER_ADMIN only; ignored for client users"),
):
    platform_client = client_id if user.role == UserRole.SUPER_ADMIN else None
    items, total = CallService(db, user, platform_client).list(
        page.offset, page.limit, status=status_filter, agent_id=agent_id,
        customer_id=customer_id, direction=direction, day=day, date_from=date_from,
        date_to=date_to)
    return paginated(items, total, page, CallListItem)


@router.get("/{call_id}", response_model=ApiResponse[CallDetail])
def get_call(call_id: int, user: AnyRoleUser, db: DbSession):
    return ApiResponse(message="Call retrieved successfully",
                       data=CallService(db, user).detail(call_id))
