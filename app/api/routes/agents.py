from fastapi import APIRouter, Query, Request, status

from app.core.dependencies import (ClientAdminOrElevated, ClientAdminUser,
                                   ClientMemberUser, DbSession, TenantId)
from app.models.enums import AgentStatus
from app.schemas.agent import AgentCreate, AgentOut, AgentUpdate
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.agent_service import AgentService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[AgentOut])
def list_agents(_: ClientMemberUser, tenant_id: TenantId, db: DbSession, page: PageParamsDep,
                status_filter: AgentStatus | None = Query(None, alias="status"),
                provider: str | None = None):
    items, total = AgentService(db, tenant_id).list(page.offset, page.limit,
                                                     status=status_filter, provider=provider)
    return paginated(items, total, page, AgentOut)


@router.post("", response_model=ApiResponse[AgentOut], status_code=status.HTTP_201_CREATED)
def create_agent(request: Request, body: AgentCreate, actor: ClientAdminOrElevated, tenant_id: TenantId,
                 db: DbSession):
    agent = AgentService(db, tenant_id).create(body, actor, _ip(request))
    return ApiResponse(message="Agent created successfully", data=AgentOut.model_validate(agent))


@router.get("/{agent_id}", response_model=ApiResponse[AgentOut])
def get_agent(agent_id: int, _: ClientMemberUser, tenant_id: TenantId, db: DbSession):
    return ApiResponse(message="Agent retrieved successfully",
                       data=AgentOut.model_validate(AgentService(db, tenant_id).get(agent_id)))


@router.patch("/{agent_id}", response_model=ApiResponse[AgentOut])
def update_agent(request: Request, agent_id: int, body: AgentUpdate, actor: ClientAdminOrElevated,
                 tenant_id: TenantId, db: DbSession):
    agent = AgentService(db, tenant_id).update(agent_id, body, actor, _ip(request))
    return ApiResponse(message="Agent updated successfully", data=AgentOut.model_validate(agent))


@router.delete("/{agent_id}", response_model=ApiResponse[None])
def delete_agent(request: Request, agent_id: int, actor: ClientAdminUser, tenant_id: TenantId,
                 db: DbSession):
    AgentService(db, tenant_id).delete(agent_id, actor, _ip(request))
    return ApiResponse(message="Agent deleted successfully")
