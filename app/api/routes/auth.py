from fastapi import APIRouter, Request, status

from app.core.dependencies import CurrentUser, DbSession
from app.core.rate_limit import LOGIN_LIMIT, REFRESH_LIMIT, REGISTER_LIMIT, limiter
from app.schemas.auth import AuthData, LoginRequest, RefreshRequest, RegisterRequest, TokenPair
from app.schemas.common import ApiResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/register", response_model=ApiResponse[AuthData], status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_LIMIT)
def register(request: Request, body: RegisterRequest, db: DbSession):
    user, tokens = AuthService(db).register(body, _ip(request))
    return ApiResponse(message="Registration successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))


@router.post("/login", response_model=ApiResponse[AuthData])
@limiter.limit(LOGIN_LIMIT)
def login(request: Request, body: LoginRequest, db: DbSession):
    user, tokens = AuthService(db).login(body, _ip(request))
    return ApiResponse(message="Login successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))


@router.post("/refresh", response_model=ApiResponse[TokenPair])
@limiter.limit(REFRESH_LIMIT)
def refresh(request: Request, body: RefreshRequest, db: DbSession):
    return ApiResponse(message="Token refreshed", data=AuthService(db).refresh(body.refresh_token))


@router.get("/me", response_model=ApiResponse[UserOut])
def me(user: CurrentUser):
    return ApiResponse(message="Current user retrieved successfully",
                       data=UserOut.model_validate(user))
