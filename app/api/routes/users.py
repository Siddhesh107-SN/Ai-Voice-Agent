"""Staff management for the caller's own client. The tenant always comes from the token."""
from fastapi import APIRouter, Request, status

from app.core.dependencies import ClientAdminUser, DbSession, TenantId
from app.models.enums import UserRole
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import UserService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[UserOut])
def list_users(_: ClientAdminUser, tenant_id: TenantId, db: DbSession, page: PageParamsDep,
               role: UserRole | None = None, is_active: bool | None = None):
    items, total = UserService(db, tenant_id).list(page.offset, page.limit, role, is_active)
    return paginated(items, total, page, UserOut)


@router.post("", response_model=ApiResponse[UserOut], status_code=status.HTTP_201_CREATED)
def create_user(request: Request, body: UserCreate, actor: ClientAdminUser, tenant_id: TenantId,
                db: DbSession):
    user = UserService(db, tenant_id).create(body, actor, _ip(request))
    return ApiResponse(message="User created successfully", data=UserOut.model_validate(user))


@router.get("/{user_id}", response_model=ApiResponse[UserOut])
def get_user(user_id: int, _: ClientAdminUser, tenant_id: TenantId, db: DbSession):
    return ApiResponse(message="User retrieved successfully",
                       data=UserOut.model_validate(UserService(db, tenant_id).get(user_id)))


@router.patch("/{user_id}", response_model=ApiResponse[UserOut])
def update_user(request: Request, user_id: int, body: UserUpdate, actor: ClientAdminUser,
                tenant_id: TenantId, db: DbSession):
    user = UserService(db, tenant_id).update(user_id, body, actor, _ip(request))
    return ApiResponse(message="User updated successfully", data=UserOut.model_validate(user))
