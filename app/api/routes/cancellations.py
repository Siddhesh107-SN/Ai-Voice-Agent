from datetime import date

from fastapi import APIRouter, Query

from app.core.dependencies import ClientMemberUser, DbSession, TenantId
from app.models.enums import ChangeSource
from app.schemas.cancellation import CancellationOut
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.cancellation_service import CancellationService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CancellationOut])
def list_cancellations(
    _: ClientMemberUser, tenant_id: TenantId, db: DbSession, page: PageParamsDep,
    customer_id: int | None = Query(None, alias="customer"),
    source: ChangeSource | None = None,
    date_from: date | None = Query(None, description="Cancelled appointment date >="),
    date_to: date | None = Query(None, description="Cancelled appointment date <="),
):
    items, total = CancellationService(db, tenant_id).list(
        page.offset, page.limit, customer_id=customer_id, source=source,
        date_from=date_from, date_to=date_to)
    return paginated(items, total, page, CancellationOut)


@router.get("/{cancellation_id}", response_model=ApiResponse[CancellationOut])
def get_cancellation(cancellation_id: int, _: ClientMemberUser, tenant_id: TenantId,
                     db: DbSession):
    return ApiResponse(message="Cancellation retrieved successfully",
                       data=CancellationOut.model_validate(
                           CancellationService(db, tenant_id).get(cancellation_id)))
