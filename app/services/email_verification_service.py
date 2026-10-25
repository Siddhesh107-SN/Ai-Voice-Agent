import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import (CodeAttemptsExceededError, CodeCooldownError,
                                 CodeExpiredError, CodeInvalidError,
                                 CodeRateLimitError)
from app.models.email_verification import EmailVerification
from app.models.user import User
from app.services.email_service import EmailService


class EmailVerificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email_service = EmailService()

    def send_verification_code(self, user: User) -> dict[str, str]:
        now = datetime.now(timezone.utc)

        # 1. 60-second resend cooldown check
        latest = self.db.scalar(
            select(EmailVerification)
            .where(EmailVerification.user_id == user.id)
            .order_by(EmailVerification.created_at.desc(), EmailVerification.id.desc())
            .limit(1)
        )
        if latest is not None:
            created = latest.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if (now - created).total_seconds() < 60:
                raise CodeCooldownError()

        # 2. At most 5 sends per hour check
        one_hour_ago = now - timedelta(hours=1)
        count_last_hour = self.db.scalar(
            select(func.count(EmailVerification.id))
            .where(
                EmailVerification.user_id == user.id,
                EmailVerification.created_at >= one_hour_ago,
            )
        ) or 0
        if count_last_hour >= 5:
            raise CodeRateLimitError()

        # 3. Generate 6-digit random code
        code = f"{secrets.randbelow(900000) + 100000}"
        code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()

        # 4. Store verification record (expires in 10 minutes)
        verification = EmailVerification(
            user_id=user.id,
            code_hash=code_hash,
            expires_at=now + timedelta(minutes=10),
            attempts=0,
            consumed_at=None,
        )
        self.db.add(verification)
        self.db.commit()

        # 5. Dispatch email
        self.email_service.send_verification_email(to_email=user.email, code=code)

        return {"message": "Verification code sent"}

    def confirm_verification_code(self, user: User, code: str) -> dict[str, str]:
        now = datetime.now(timezone.utc)

        verification = self.db.scalar(
            select(EmailVerification)
            .where(
                EmailVerification.user_id == user.id,
                EmailVerification.consumed_at.is_(None),
            )
            .order_by(EmailVerification.created_at.desc(), EmailVerification.id.desc())
            .limit(1)
        )
        if verification is None:
            raise CodeExpiredError("No active verification code found")

        exp = verification.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            raise CodeExpiredError()

        if verification.attempts >= 5:
            raise CodeAttemptsExceededError()

        # Increment attempts counter
        verification.attempts += 1

        submitted_hash = hashlib.sha256(code.strip().encode("utf-8")).hexdigest()
        if not hmac.compare_digest(submitted_hash, verification.code_hash):
            self.db.commit()
            tries_left = max(0, 5 - verification.attempts)
            if tries_left == 0:
                raise CodeAttemptsExceededError()
            raise CodeInvalidError(tries_left=tries_left)

        # Success: consume code and mark user verified
        verification.consumed_at = now
        user.email_verified_at = now
        self.db.commit()

        return {"message": "Email verified successfully"}
