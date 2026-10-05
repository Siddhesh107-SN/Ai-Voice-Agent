"""Registration, login and token refresh."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, InvalidTokenError, UnauthorizedError
from app.core.security import (DUMMY_HASH, TokenType, create_access_token, create_refresh_token,
                               decode_token, hash_password, password_needs_rehash, verify_password)
from app.models.enums import ClientStatus
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.services.audit_service import record_audit
from app.services.client_service import provision_client
from app.services.transactions import commit_or_conflict


def issue_tokens(user: User) -> TokenPair:
    settings = get_settings()
    return TokenPair(
        access_token=create_access_token(user.id, user.client_id, user.role),
        refresh_token=create_refresh_token(user.id, user.client_id, user.role),
        expires_in=settings.access_token_expire_minutes * 60,
    )


def _ensure_can_authenticate(user: User) -> None:
    if not user.is_active:
        raise ForbiddenError("This user account is disabled", error_code="USER_INACTIVE")
    if user.client is not None and user.client.status != ClientStatus.ACTIVE:
        raise ForbiddenError("This client account is disabled", error_code="CLIENT_DISABLED")


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, data: RegisterRequest, ip: str | None) -> tuple[User, TokenPair]:
        # Role is fixed server-side: public registration can only create a CLIENT_ADMIN.
        client, user = provision_client(
            self.db, business_name=data.business_name, email=data.email, phone=data.phone,
            address=None, timezone=data.timezone, admin_name=data.name, admin_email=data.email,
            admin_password=data.password)
        record_audit(self.db, "auth.register", user_id=user.id, client_id=client.id,
                     entity_type="client", entity_id=client.id, ip_address=ip)
        commit_or_conflict(self.db, "Email is already registered", "EMAIL_ALREADY_REGISTERED")
        self.db.refresh(user)
        return user, issue_tokens(user)

    def login(self, data: LoginRequest, ip: str | None) -> tuple[User, TokenPair]:
        user = self.users.get_by_email(data.email)
        # Always run one verification so response time doesn't leak whether the email exists.
        valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
        if user is None or not valid:
            record_audit(self.db, "auth.login_failed", user_id=user.id if user else None,
                         client_id=user.client_id if user else None, ip_address=ip)
            self.db.commit()
            raise UnauthorizedError("Invalid email or password", error_code="INVALID_CREDENTIALS")
        _ensure_can_authenticate(user)
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(data.password)
        record_audit(self.db, "auth.login", user_id=user.id, client_id=user.client_id,
                     ip_address=ip)
        self.db.commit()
        return user, issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token, TokenType.REFRESH)
        user = self.users.get_by_id(payload.user_id)
        if user is None or user.client_id != payload.client_id or user.role != payload.role:
            raise InvalidTokenError()
        _ensure_can_authenticate(user)
        return issue_tokens(user)
