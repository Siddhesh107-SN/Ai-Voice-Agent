from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.email_verification import (EmailVerifyConfirmRequest,
                                           EmailVerifyResponse)
from app.services.email_verification_service import EmailVerificationService

router = APIRouter()


@router.post("/send", response_model=EmailVerifyResponse)
def send_email_verification(user: CurrentUser, db: DbSession):
    """Request a 6-digit email verification code."""
    return EmailVerificationService(db).send_verification_code(user)


@router.post("/confirm", response_model=EmailVerifyResponse)
def confirm_email_verification(
    body: EmailVerifyConfirmRequest,
    user: CurrentUser,
    db: DbSession,
):
    """Confirm 6-digit email verification code."""
    return EmailVerificationService(db).confirm_verification_code(user, body.code)
