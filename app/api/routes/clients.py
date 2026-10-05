from fastapi import APIRouter, Query, Request, status

from app.core.dependencies import (ClientAdminUser, ClientMemberUser, DbSession, SuperAdminUser)
from app.models.enums import ClientStatus
from app.repositories.agent_repository import AgentRepository
from app.repositories.user_repository import TenantUserRepository
from app.schemas.client import ClientCreate, ClientOut, ClientProfileUpdate, ClientUpdate
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.agent import AgentOut
from app.schemas.user import UserOut
from app.services.client_service import ClientService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


# ----- own business profile (declared first so "/me" is never read as an id) -----
@router.get("/me", response_model=ApiResponse[ClientOut])
def get_my_client(user: ClientMemberUser, db: DbSession):
    client = ClientService(db).get(user.client_id)
    return ApiResponse(message="Business profile retrieved successfully",
                       data=ClientOut.model_validate(client))


@router.patch("/me", response_model=ApiResponse[ClientOut])
def update_my_client(request: Request, body: ClientProfileUpdate, user: ClientAdminUser,
                     db: DbSession):
    client = ClientService(db).update_own(user.client_id, body, user, _ip(request))
    return ApiResponse(message="Business profile updated successfully",
                       data=ClientOut.model_validate(client))


# ----- platform administration (SUPER_ADMIN only) -----
@router.post("", response_model=ApiResponse[ClientOut], status_code=status.HTTP_201_CREATED)
def create_client(request: Request, body: ClientCreate, actor: SuperAdminUser, db: DbSession):
    client = ClientService(db).create(body, actor, _ip(request))
    return ApiResponse(message="Client created successfully", data=ClientOut.model_validate(client))


@router.get("", response_model=PaginatedResponse[ClientOut])
def list_clients(_: SuperAdminUser, db: DbSession, page: PageParamsDep,
                 status_filter: ClientStatus | None = Query(None, alias="status"),
                 search: str | None = Query(None, max_length=100)):
    items, total = ClientService(db).list(page.offset, page.limit, status_filter, search)
    return paginated(items, total, page, ClientOut)


@router.get("/{client_id}", response_model=ApiResponse[ClientOut])
def get_client(client_id: int, _: SuperAdminUser, db: DbSession):
    return ApiResponse(message="Client retrieved successfully",
                       data=ClientOut.model_validate(ClientService(db).get(client_id)))


@router.patch("/{client_id}", response_model=ApiResponse[ClientOut])
def update_client(request: Request, client_id: int, body: ClientUpdate, actor: SuperAdminUser,
                  db: DbSession):
    client = ClientService(db).update(client_id, body, actor, _ip(request))
    return ApiResponse(message="Client updated successfully", data=ClientOut.model_validate(client))


@router.post("/{client_id}/disable", response_model=ApiResponse[ClientOut])
def disable_client(request: Request, client_id: int, actor: SuperAdminUser, db: DbSession):
    client = ClientService(db).set_status(client_id, ClientStatus.DISABLED, actor, _ip(request))
    return ApiResponse(message="Client disabled successfully", data=ClientOut.model_validate(client))


@router.post("/{client_id}/enable", response_model=ApiResponse[ClientOut])
def enable_client(request: Request, client_id: int, actor: SuperAdminUser, db: DbSession):
    client = ClientService(db).set_status(client_id, ClientStatus.ACTIVE, actor, _ip(request))
    return ApiResponse(message="Client enabled successfully", data=ClientOut.model_validate(client))


@router.get("/{client_id}/users", response_model=PaginatedResponse[UserOut])
def list_client_users(client_id: int, _: SuperAdminUser, db: DbSession, page: PageParamsDep):
    ClientService(db).get(client_id)  # 404 if the client doesn't exist
    items, total = TenantUserRepository(db, client_id).list(offset=page.offset, limit=page.limit)
    return paginated(items, total, page, UserOut)


@router.get("/{client_id}/agents", response_model=PaginatedResponse[AgentOut])
def list_client_agents(client_id: int, _: SuperAdminUser, db: DbSession, page: PageParamsDep):
    ClientService(db).get(client_id)  # 404 if the client doesn't exist
    items, total = AgentRepository(db, client_id).list(offset=page.offset, limit=page.limit)
    return paginated(items, total, page, AgentOut)
