from fastapi import APIRouter, Request

from app.core.dependencies import ClientAdminUser, ClientMemberUser, DbSession
from app.schemas.pin import PinChangeRequest, PinVerifyRequest
from app.services.pin_service import PinService

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/verify")
def verify_pin(request: Request, body: PinVerifyRequest, user: ClientMemberUser, db: DbSession):
    return PinService(db).verify_pin(
        client_id=user.client_id,
        user_id=user.id,
        pin=body.pin,
        ip=_ip(request),
    )


@router.post("/change")
def change_pin(request: Request, body: PinChangeRequest, user: ClientAdminUser, db: DbSession):
    return PinService(db).change_pin(
        client_id=user.client_id,
        user_id=user.id,
        current_pin=body.currentPin,
        new_pin=body.newPin,
        confirm_pin=body.confirmPin,
        ip=_ip(request),
    )
