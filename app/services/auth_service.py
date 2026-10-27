"""Registration, login, token refresh and logout."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import (BadRequestError, ForbiddenError, InvalidTokenError,
                                 NotFoundError, TokenExpiredError, UnauthorizedError)
from app.core.security import (DUMMY_HASH, TokenType, create_access_token,
                               create_refresh_token, decode_token,
                               hash_password, password_needs_rehash,
                               verify_password)
from app.models.enums import AccessStatus, ClientStatus
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.services.audit_service import record_audit
from app.services.client_service import provision_client
from app.services.protection_service import assert_user_not_protected
from app.services.transactions import commit_or_conflict


def issue_tokens(user: User, db: Session, ip: str | None = None,
                 user_agent: str | None = None) -> TokenPair:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    delta = timedelta(days=settings.refresh_token_expire_days)
    expires_at = now + delta

    token_record = RefreshToken(
        id=jti,
        user_id=user.id,
        expires_at=expires_at,
        created_at=now,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(token_record)
    return TokenPair(
        access_token=create_access_token(user.id, user.client_id, user.role),
        refresh_token=create_refresh_token(user.id, user.client_id, user.role, expires_delta=delta, jti=jti),
        expires_in=settings.access_token_expire_minutes * 60,
    )


def _ensure_can_authenticate(user: User) -> None:
    if not user.is_active:
        raise ForbiddenError("This user account is disabled", error_code="USER_INACTIVE")
    if user.client is not None:
        if (
            user.client.status != ClientStatus.ACTIVE
            or not getattr(user.client, "is_active", True)
            or user.client.access_status == AccessStatus.SUSPENDED
        ):
            raise ForbiddenError("This client account is disabled", error_code="CLIENT_DISABLED")



class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, data: RegisterRequest, ip: str | None,
                 user_agent: str | None = None) -> tuple[User, TokenPair]:
        # Role is fixed server-side: public registration can only create a CLIENT_ADMIN.
        client, user = provision_client(
            self.db, business_name=data.business_name, email=data.email, phone=data.phone,
            address=None, timezone=data.timezone, country_code=data.country_code,
            admin_name=data.name, admin_email=data.email, admin_password=data.password,
            access_status=AccessStatus.PENDING_PAYMENT)
        record_audit(self.db, "auth.register", user_id=user.id, client_id=client.id,
                     entity_type="client", entity_id=client.id, ip_address=ip)
        commit_or_conflict(self.db, "Email is already registered", "EMAIL_ALREADY_REGISTERED")
        self.db.refresh(user)
        tokens = issue_tokens(user, self.db, ip=ip, user_agent=user_agent)
        self.db.commit()
        return user, tokens

    def login(self, data: LoginRequest, ip: str | None,
              user_agent: str | None = None) -> tuple[User, TokenPair]:
        user = self.users.get_by_email(data.email)
        # Always run one verification so response time doesn't leak whether the email exists.
        valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
        if user is None or not valid:
            record_audit(self.db, "auth.login_failed", user_id=user.id if user else None,
                         client_id=user.client_id if user else None, ip_address=ip)
            self.db.commit()
            raise UnauthorizedError("Invalid email or password", error_code="INVALID_CREDENTIALS")
        _ensure_can_authenticate(user)
        user.last_login_at = datetime.now(timezone.utc)
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(data.password)
        record_audit(self.db, "auth.login", user_id=user.id, client_id=user.client_id,
                     ip_address=ip)
        tokens = issue_tokens(user, self.db, ip=ip, user_agent=user_agent)
        self.db.commit()
        return user, tokens

    def refresh(self, refresh_token: str, ip: str | None = None,
                user_agent: str | None = None) -> TokenPair:
        payload = decode_token(refresh_token, TokenType.REFRESH)
        if not payload.jti:
            raise InvalidTokenError()

        token_record = self.db.get(RefreshToken, payload.jti)
        if not token_record:
            raise InvalidTokenError()

        now = datetime.now(timezone.utc)
        # If a revoked token is presented again, revoke all of that user's refresh tokens.
        if token_record.revoked_at is not None:
            self.db.query(RefreshToken).filter(
                RefreshToken.user_id == token_record.user_id,
                RefreshToken.revoked_at.is_(None),
            ).update({"revoked_at": now})
            self.db.commit()
            raise InvalidTokenError()

        if token_record.expires_at <= now:
            raise TokenExpiredError()

        user = self.users.get_by_id(payload.user_id)
        if user is None or user.client_id != payload.client_id or user.role != payload.role:
            raise InvalidTokenError()
        _ensure_can_authenticate(user)

        # ROTATE it: revoke old token, issue new token
        new_jti = uuid.uuid4().hex
        token_record.revoked_at = now
        token_record.replaced_by = new_jti

        settings = get_settings()
        delta = timedelta(days=settings.refresh_token_expire_days)
        new_expires_at = now + delta

        new_record = RefreshToken(
            id=new_jti,
            user_id=user.id,
            expires_at=new_expires_at,
            created_at=now,
            ip=ip,
            user_agent=user_agent,
        )
        self.db.add(new_record)
        self.db.commit()

        return TokenPair(
            access_token=create_access_token(user.id, user.client_id, user.role),
            refresh_token=create_refresh_token(user.id, user.client_id, user.role, expires_delta=delta, jti=new_jti),
            expires_in=settings.access_token_expire_minutes * 60,
        )

    def logout(self, refresh_token: str, ip: str | None = None) -> None:
        """Revoke the refresh token and write an audit-log entry.
        Must succeed even if the token is already invalid."""
        now = datetime.now(timezone.utc)
        user_id = None
        client_id = None
        try:
            payload = decode_token(refresh_token, TokenType.REFRESH)
            user_id = payload.user_id
            client_id = payload.client_id
            if payload.jti:
                token_record = self.db.get(RefreshToken, payload.jti)
                if token_record and token_record.revoked_at is None:
                    token_record.revoked_at = now
        except Exception:
            pass

        record_audit(self.db, "auth.logout", user_id=user_id, client_id=client_id, ip_address=ip)
        self.db.commit()

    def change_password(
        self, user: User, current_password: str, new_password: str, ip: str | None = None
    ) -> None:
        """Only the account owner may change their own password, through the authenticated flow."""
        if not verify_password(current_password, user.password_hash):
            record_audit(
                self.db,
                "auth.change_password_failed",
                user_id=user.id,
                client_id=user.client_id,
                ip_address=ip,
                level="warn",
                message="Incorrect current password provided",
            )
            self.db.commit()
            raise BadRequestError("Current password is incorrect", error_code="INVALID_CURRENT_PASSWORD")

        user.password_hash = hash_password(new_password)
        record_audit(
            self.db,
            "auth.change_password",
            user_id=user.id,
            client_id=user.client_id,
            ip_address=ip,
            level="info",
            message=f"Password changed for user {user.email}",
        )
        self.db.commit()

    def forgot_password(self, email: str, ip: str | None = None) -> dict[str, str]:
        """Request password reset. Protected accounts are rejected with 403."""
        user = self.users.get_by_email(email.lower())
        if user is not None and getattr(user, "is_protected", False):
            assert_user_not_protected(user, "forgot_password", actor=None, db=self.db, ip=ip)

        if user is not None:
            record_audit(
                self.db,
                "auth.forgot_password_requested",
                user_id=user.id,
                client_id=user.client_id,
                ip_address=ip,
                level="info",
            )
            self.db.commit()
        return {"message": "If this email is registered, instructions to reset your password have been sent."}

    def reset_password_by_admin(
        self, target_user_id: int, new_password: str, actor: User, ip: str | None = None
    ) -> None:
        """Admin or super admin resets a user password. Forbidden if target user is protected."""
        target_user = self.users.get_by_id(target_user_id)
        if target_user is None:
            raise NotFoundError("User not found", error_code="USER_NOT_FOUND")

        if getattr(target_user, "is_protected", False):
            assert_user_not_protected(
                target_user,
                "reset_password",
                actor=actor,
                db=self.db,
                ip=ip,
                details={"admin_id": actor.id},
            )

        target_user.password_hash = hash_password(new_password)
        record_audit(
            self.db,
            "auth.admin_reset_password",
            user_id=actor.id,
            client_id=actor.client_id,
            entity_type="user",
            entity_id=target_user.id,
            ip_address=ip,
            level="info",
            message=f"Admin {actor.email} reset password for {target_user.email}",
        )
        self.db.commit()
