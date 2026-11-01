import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.exceptions import AppError
from app.core.security import hash_password
from app.models.password_reset_code import PasswordResetCode
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.audit_service import record_audit
from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    EmailService,
)

logger = logging.getLogger(__name__)
INVALID_RESET_ERROR = "Invalid or expired reset code"


class InvalidPasswordResetCodeError(AppError):
    status_code = 400
    error_code = "INVALID_RESET_CODE"
    message = INVALID_RESET_ERROR

    def __init__(self) -> None:
        self.custom_body = {"detail": self.message, "code": self.error_code}
        super().__init__(self.message, error_code=self.error_code)


def _code_digest(code: str) -> str:
    secret = get_settings().jwt_secret_key.encode("utf-8")
    return hmac.new(secret, code.encode("ascii"), hashlib.sha256).hexdigest()


class PasswordResetService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()

    def request_code(self, email: str, ip: str | None = None) -> tuple[int, str, str] | None:
        self.email.ensure_password_reset_delivery_configured()
        user = self.db.scalar(
            select(User).where(User.email == email.lower()).with_for_update()
        )
        if user is None or user.is_protected or not user.is_active:
            return None

        now = datetime.now(timezone.utc)
        recent_codes = self.db.scalars(
            select(PasswordResetCode)
            .where(
                PasswordResetCode.user_id == user.id,
                PasswordResetCode.created_at >= now - timedelta(hours=1),
            )
            .order_by(PasswordResetCode.created_at.desc())
        ).all()
        if recent_codes and (
            now - recent_codes[0].created_at < timedelta(seconds=60)
            or len(recent_codes) >= 5
        ):
            return None

        code = f"{secrets.randbelow(900_000) + 100_000:06d}"
        self.db.execute(
            update(PasswordResetCode)
            .where(
                PasswordResetCode.user_id == user.id,
                PasswordResetCode.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        self.db.add(
            PasswordResetCode(
                user_id=user.id,
                code_hash=_code_digest(code),
                expires_at=now + timedelta(minutes=10),
            )
        )
        record_audit(
            self.db,
            "auth.password_reset_requested",
            user_id=user.id,
            client_id=user.client_id,
            ip_address=ip,
            level="info",
        )
        self.db.commit()
        return user.id, user.email, code

    def deliver_code(self, user_id: int, email: str, code: str) -> None:
        try:
            self.email.send_password_reset_code(email, code)
        except (EmailConfigurationError, EmailDeliveryError):
            self.db.execute(
                update(PasswordResetCode)
                .where(
                    PasswordResetCode.user_id == user_id,
                    PasswordResetCode.code_hash == _code_digest(code),
                    PasswordResetCode.consumed_at.is_(None),
                )
                .values(consumed_at=datetime.now(timezone.utc))
            )
            self.db.commit()
            logger.warning("Password reset email delivery failed")

    def reset_password(
        self, email: str, code: str, new_password: str, ip: str | None = None
    ) -> None:
        user = self.db.scalar(
            select(User).where(User.email == email.lower()).with_for_update()
        )
        now = datetime.now(timezone.utc)
        reset = None
        if user is not None and not user.is_protected:
            reset = self.db.scalar(
                select(PasswordResetCode)
                .where(
                    PasswordResetCode.user_id == user.id,
                    PasswordResetCode.consumed_at.is_(None),
                )
                .order_by(PasswordResetCode.created_at.desc())
                .with_for_update()
            )

        if user is None or user.is_protected or not user.is_active or reset is None:
            raise InvalidPasswordResetCodeError()
        if reset.attempts >= 5 or reset.expires_at <= now:
            reset.consumed_at = now
            self.db.commit()
            raise InvalidPasswordResetCodeError()

        if not hmac.compare_digest(reset.code_hash, _code_digest(code)):
            reset.attempts += 1
            if reset.attempts >= 5:
                reset.consumed_at = now
            self.db.commit()
            raise InvalidPasswordResetCodeError()

        user.password_hash = hash_password(new_password)
        user.auth_version += 1
        reset.consumed_at = now
        self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        record_audit(
            self.db,
            "auth.password_reset",
            user_id=user.id,
            client_id=user.client_id,
            ip_address=ip,
            level="info",
        )
        self.db.commit()


def process_password_reset_request(email: str, ip: str | None) -> None:
    with SessionLocal() as db:
        service = PasswordResetService(db)
        pending = service.request_code(email, ip)
        if pending:
            service.deliver_code(*pending)
