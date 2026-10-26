"""Reusable FastAPI dependencies: authentication, RBAC and tenant resolution."""
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import (AccessNotApprovedError, ForbiddenError,
                                 InvalidTokenError, UnauthorizedError)
from app.core.security import TokenType, decode_token
from app.models.enums import AccessStatus, ClientStatus, UserRole
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
    if user.client is not None:
        if (
            user.client.status != ClientStatus.ACTIVE
            or not getattr(user.client, "is_active", True)
            or user.client.access_status == AccessStatus.SUSPENDED
        ):
            raise ForbiddenError("This client account is disabled", error_code="CLIENT_DISABLED")
    return user



CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


def require_roles(*roles: UserRole, require_active_access: bool = False) -> Callable[[User], User]:
    """Dependency factory: `Depends(require_roles(UserRole.CLIENT_ADMIN))`."""

    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError(error_code="INSUFFICIENT_PERMISSIONS")
        if require_active_access and user.client is not None:
            if user.client.access_status != AccessStatus.ACTIVE:
                raise AccessNotApprovedError()
        return user

    return checker


def require_client_user(user: CurrentUser) -> User:
    """Requires an authenticated client user (CLIENT_ADMIN or CLIENT_STAFF) regardless of access_status."""
    if user.role not in CLIENT_ROLES or user.client_id is None:
        raise ForbiddenError("This endpoint requires a client account", error_code="TENANT_REQUIRED")
    return user


def require_client_admin_or_elevated(
    user: CurrentUser,
    x_admin_session: Annotated[str | None, Header(alias="X-Admin-Session")] = None,
) -> User:
    """Allows client_admin, or client_staff presenting a valid header X-Admin-Session
    (the elevation JWT) whose sub and client_id match the signed-in user."""
    if user.client is None or user.client.access_status != AccessStatus.ACTIVE:
        raise AccessNotApprovedError()

    if user.role == UserRole.CLIENT_ADMIN:
        return user

    if user.role == UserRole.CLIENT_STAFF:
        if not x_admin_session:
            raise ForbiddenError("Staff elevation required", error_code="ELEVATION_REQUIRED")

        settings = get_settings()
        try:
            claims = jwt.decode(x_admin_session, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        except ExpiredSignatureError:
            raise ForbiddenError("Elevation token has expired", error_code="ELEVATION_EXPIRED")
        except JWTError:
            raise ForbiddenError("Invalid elevation token", error_code="ELEVATION_INVALID")

        if (
            not claims.get("elev")
            or str(claims.get("sub")) != str(user.id)
            or claims.get("client_id") != user.client_id
        ):
            raise ForbiddenError("Elevation token does not match user or client", error_code="ELEVATION_INVALID")

        return user

    raise ForbiddenError(error_code="INSUFFICIENT_PERMISSIONS")


def get_tenant_id(user: CurrentUser) -> int:
    """The tenant is ALWAYS taken from the authenticated user, never from request input."""
    if user.client_id is None:
        raise ForbiddenError("This endpoint requires a client account", error_code="TENANT_REQUIRED")
    return user.client_id


TenantId = Annotated[int, Depends(get_tenant_id)]

SuperAdminUser = Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, require_active_access=False))]
ClientAdminUser = Annotated[User, Depends(require_roles(UserRole.CLIENT_ADMIN, require_active_access=True))]
ClientMemberUser = Annotated[User, Depends(require_roles(*CLIENT_ROLES, require_active_access=True))]
ClientAdminOrElevated = Annotated[User, Depends(require_client_admin_or_elevated)]
PendingOrActiveClientUser = Annotated[User, Depends(require_client_user)]
AnyRoleUser = Annotated[User, Depends(require_roles(*UserRole, require_active_access=False))]
