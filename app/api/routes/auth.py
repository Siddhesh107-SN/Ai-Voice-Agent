from fastapi import APIRouter, BackgroundTasks, Request, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.core.exceptions import ServiceUnavailableError
from app.core.rate_limit import LOGIN_LIMIT, REFRESH_LIMIT, REGISTER_LIMIT, limiter
from app.services.email_service import EmailConfigurationError, EmailService
from app.schemas.auth import (AuthData, ChangePasswordRequest, ForgotPasswordRequest,
                              LoginRequest, LogoutRequest, RefreshRequest, ResetPasswordRequest,
                              RegisterRequest, TokenPair)
from app.schemas.common import ApiResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.services.password_reset_service import (
    PasswordResetService,
    process_password_reset_request,
)

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


@router.post("/register", response_model=ApiResponse[AuthData], status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_LIMIT)
def register(request: Request, body: RegisterRequest, db: DbSession):
    user, tokens = AuthService(db).register(body, _ip(request), _user_agent(request))
    return ApiResponse(message="Registration successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))


@router.post("/login", response_model=ApiResponse[AuthData])
@limiter.limit(LOGIN_LIMIT)
def login(request: Request, body: LoginRequest, db: DbSession):
    user, tokens = AuthService(db).login(body, _ip(request), _user_agent(request))
    return ApiResponse(message="Login successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))


@router.post("/refresh", response_model=ApiResponse[TokenPair])
@limiter.limit(REFRESH_LIMIT)
def refresh(request: Request, body: RefreshRequest, db: DbSession):
    tokens = AuthService(db).refresh(body.refresh_token, _ip(request), _user_agent(request))
    return ApiResponse(message="Token refreshed", data=tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, body: LogoutRequest, db: DbSession):
    AuthService(db).logout(body.refresh_token, _ip(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=ApiResponse[UserOut])
def me(user: CurrentUser):
    return ApiResponse(message="Current user retrieved successfully",
                       data=UserOut.model_validate(user))


@router.post("/change-password", response_model=ApiResponse[dict])
def change_password(request: Request, body: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    """Owner changes own password. Requires verified current password."""
    AuthService(db).change_password(user, body.current_password, body.new_password, _ip(request))
    return ApiResponse(message="Password changed successfully", data={"status": "success"})


@router.post("/forgot-password", response_model=ApiResponse[dict])
@limiter.limit(LOGIN_LIMIT)
def forgot_password(
    request: Request,
    background_tasks: BackgroundTasks,
    body: ForgotPasswordRequest,
):
    """Request a one-time email code without revealing whether an account is eligible."""
    try:
        EmailService().ensure_password_reset_delivery_configured()
    except EmailConfigurationError as exc:
        raise ServiceUnavailableError(
            "Password reset email is temporarily unavailable",
            error_code="EMAIL_DELIVERY_UNAVAILABLE",
        ) from exc
    background_tasks.add_task(
        process_password_reset_request,
        body.email,
        _ip(request),
    )
    return ApiResponse(
        message="If this email is eligible, password-reset instructions have been sent.",
        data={"status": "sent"},
    )


@router.post("/reset-password", response_model=ApiResponse[dict])
@limiter.limit(LOGIN_LIMIT)
def reset_password(request: Request, body: ResetPasswordRequest, db: DbSession):
    """Consume a one-time reset code and revoke the user's refresh sessions."""
    PasswordResetService(db).reset_password(
        body.email, body.code, body.new_password, _ip(request)
    )
    return ApiResponse(
        message="Password reset successfully",
        data={"status": "reset"},
    )
