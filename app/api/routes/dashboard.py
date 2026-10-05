from fastapi import APIRouter

from app.core.dependencies import ClientMemberUser, DbSession, SuperAdminUser, TenantId
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardSummary, PlatformDashboardSummary
from app.services.client_service import ClientService
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/summary", response_model=ApiResponse[DashboardSummary])
def get_dashboard_summary(_: ClientMemberUser, tenant_id: TenantId, db: DbSession):
    return ApiResponse(message="Dashboard summary retrieved successfully",
                       data=DashboardService(db).client_summary(tenant_id))


@router.get("/admin/summary", response_model=ApiResponse[PlatformDashboardSummary])
def get_platform_dashboard_summary(_: SuperAdminUser, db: DbSession):
    return ApiResponse(message="Platform dashboard summary retrieved successfully",
                       data=DashboardService(db).platform_summary())


@router.get("/admin/clients/{client_id}/summary", response_model=ApiResponse[DashboardSummary])
def get_client_dashboard_summary(client_id: int, _: SuperAdminUser, db: DbSession):
    ClientService(db).get(client_id)  # 404 if the client doesn't exist
    return ApiResponse(message="Client dashboard summary retrieved successfully",
                       data=DashboardService(db).client_summary(client_id))
