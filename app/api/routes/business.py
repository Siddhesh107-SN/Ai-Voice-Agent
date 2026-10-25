from fastapi import APIRouter, Request

from app.core.dependencies import (ClientAdminOrElevated, ClientMemberUser,
                                   DbSession)
from app.schemas.business import (BusinessProfileBundleOut,
                                  BusinessProfilePatchRequest)
from app.services.business_service import BusinessService

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=BusinessProfileBundleOut)
def get_business(user: ClientMemberUser, db: DbSession):
    """Retrieve full business profile bundle: status, hours, services, staff, and timezone."""
    return BusinessService(db).get_business_bundle(user.client_id)


@router.patch("", response_model=BusinessProfileBundleOut)
def update_business(
    request: Request,
    body: BusinessProfilePatchRequest,
    user: ClientAdminOrElevated,
    db: DbSession,
):
    """Atomically update hours, services, or staff members."""
    return BusinessService(db).update_business_bundle(
        client_id=user.client_id,
        user=user,
        data=body,
        ip=_ip(request),
    )
