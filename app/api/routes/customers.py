from fastapi import APIRouter, Query, Request, status

from app.core.dependencies import (ClientAdminOrElevated, ClientAdminUser,
                                   ClientMemberUser, DbSession, TenantId)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.services.customer_service import CustomerService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[CustomerOut])
def list_customers(_: ClientMemberUser, tenant_id: TenantId, db: DbSession, page: PageParamsDep,
                   search: str | None = Query(None, max_length=100)):
    items, total = CustomerService(db, tenant_id).list(page.offset, page.limit, search)
    return paginated(items, total, page, CustomerOut)


@router.get("/{customer_id}", response_model=ApiResponse[CustomerOut])
def get_customer(customer_id: int, _: ClientMemberUser, tenant_id: TenantId, db: DbSession):
    return ApiResponse(message="Customer retrieved successfully",
                       data=CustomerOut.model_validate(CustomerService(db, tenant_id).get(customer_id)))


@router.post("", response_model=ApiResponse[CustomerOut], status_code=status.HTTP_201_CREATED)
def create_customer(request: Request, body: CustomerCreate, actor: ClientAdminOrElevated,
                    tenant_id: TenantId, db: DbSession):
    customer = CustomerService(db, tenant_id).create(body, actor, _ip(request))
    return ApiResponse(message="Customer created successfully", data=CustomerOut.model_validate(customer))


@router.patch("/{customer_id}", response_model=ApiResponse[CustomerOut])
def update_customer(request: Request, customer_id: int, body: CustomerUpdate,
                    actor: ClientAdminOrElevated, tenant_id: TenantId, db: DbSession):
    customer = CustomerService(db, tenant_id).update(customer_id, body, actor, _ip(request))
    return ApiResponse(message="Customer updated successfully", data=CustomerOut.model_validate(customer))


@router.delete("/{customer_id}", response_model=ApiResponse[None])
def delete_customer(request: Request, customer_id: int, actor: ClientAdminUser,
                    tenant_id: TenantId, db: DbSession):
    CustomerService(db, tenant_id).delete(customer_id, actor, _ip(request))
    return ApiResponse(message="Customer deleted successfully")
