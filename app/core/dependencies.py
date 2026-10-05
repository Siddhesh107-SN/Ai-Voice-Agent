"""Reusable FastAPI dependencies: authentication, RBAC and tenant resolution."""
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, InvalidTokenError, UnauthorizedError
from app.core.security import TokenType, decode_token
from app.models.enums import ClientStatus, UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository

# auto_error=False so a missing header yields our standard 401 body, not FastAPI's default.
bearer_scheme = HTTPBearer(auto_error=False)

ADMIN_ROLES = (UserRole.SUPER_ADMIN, UserRole.CLIENT_ADMIN)
CLIENT_ROLES = (UserRole.CLIENT_ADMIN, UserRole.CLIENT_STAFF)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Authenticate the request. The user is re-loaded from the DB on every call, so a
    deactivated user/client loses access immediately instead of when the token expires."""
    if credentials is None:
        raise UnauthorizedError()
    payload = decode_token(credentials.credentials, TokenType.ACCESS)
    user = UserRepository(db).get_by_id(payload.user_id)
    # Token claims must still match the DB (tenant or role changed => token is stale).
    if user is None or user.client_id != payload.client_id or user.role != payload.role:
        raise InvalidTokenError()
    if not user.is_active:
        raise ForbiddenError("This user account is disabled", error_code="USER_INACTIVE")
    if user.client is not None and user.client.status != ClientStatus.ACTIVE:
        raise ForbiddenError("This client account is disabled", error_code="CLIENT_DISABLED")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory: `Depends(require_roles(UserRole.CLIENT_ADMIN))`."""

    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError(error_code="INSUFFICIENT_PERMISSIONS")
        return user

    return checker


def get_tenant_id(user: CurrentUser) -> int:
    """The tenant is ALWAYS taken from the authenticated user, never from request input."""
    if user.client_id is None:
        raise ForbiddenError("This endpoint requires a client account", error_code="TENANT_REQUIRED")
    return user.client_id


TenantId = Annotated[int, Depends(get_tenant_id)]


SuperAdminUser = Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))]
ClientAdminUser = Annotated[User, Depends(require_roles(UserRole.CLIENT_ADMIN))]
ClientMemberUser = Annotated[User, Depends(require_roles(*CLIENT_ROLES))]
AnyRoleUser = Annotated[User, Depends(require_roles(*UserRole))]
