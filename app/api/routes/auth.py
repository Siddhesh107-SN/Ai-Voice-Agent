from fastapi import APIRouter, Request, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.core.rate_limit import LOGIN_LIMIT, REFRESH_LIMIT, REGISTER_LIMIT, limiter
from app.schemas.auth import (AuthData, LoginRequest, LogoutRequest,
                              RefreshRequest, RegisterRequest, TokenPair)
from app.schemas.common import ApiResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService

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
