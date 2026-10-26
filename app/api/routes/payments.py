from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.dependencies import DbSession, PendingOrActiveClientUser
from app.core.exceptions import ForbiddenError
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.payment import PaymentManualSubmitResponse
from app.services.payment_service import PaymentService

router = APIRouter()


def require_payment_admin(user: PendingOrActiveClientUser) -> User:
    if user.role != UserRole.CLIENT_ADMIN:
        raise ForbiddenError("Only client admins can submit payments", error_code="INSUFFICIENT_PERMISSIONS")
    return user


PaymentAdminUser = Annotated[User, Depends(require_payment_admin)]


@router.post("/manual-submit", response_model=PaymentManualSubmitResponse)
def manual_submit_payment(
    package_id: Annotated[str, Form(...)],
    billing_cycle: Annotated[str, Form(...)],
    amount_paid: Annotated[int, Form(...)],
    transaction_id: Annotated[str, Form(...)],
    payment_date: Annotated[date, Form(...)],
    user: PaymentAdminUser,
    db: DbSession,
    payer_name: Annotated[str | None, Form()] = None,
    screenshot: Annotated[UploadFile | None, File()] = None,
):
    """Submit manual UPI payment details with optional screenshot receipt."""
    return PaymentService(db).manual_submit(
        user=user,
        package_id=package_id,
        billing_cycle=billing_cycle,
        amount_paid=amount_paid,
        transaction_id=transaction_id,
        payment_date=payment_date,
        payer_name=payer_name,
        screenshot=screenshot,
    )
