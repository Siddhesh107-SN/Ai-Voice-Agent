import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import (BadRequestError, EmailNotVerifiedError,
                                 PaymentNotAllowedError,
                                 TransactionDuplicateError)
from app.models.client import Client
from app.models.enums import (AccessStatus, BillingCycle, OnboardingStage,
                              PaymentStatus, SubscriptionStatus)
from app.models.payment import Payment
from app.models.plan import Plan, Subscription
from app.models.user import User
from app.schemas.payment import PaymentManualSubmitResponse

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
TRANSACTION_ID_REGEX = re.compile(r"^[A-Za-z0-9]{8,20}$")


class PaymentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def detect_file_extension(self, header: bytes) -> str | None:
        """Inspect magic bytes to allow only PNG, JPEG, WebP, or PDF."""
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            return ".png"
        if header.startswith(b"\xff\xd8\xff"):
            return ".jpg"
        if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
            return ".webp"
        if header.startswith(b"%PDF-"):
            return ".pdf"
        return None

    def save_screenshot(self, screenshot: UploadFile | None) -> str | None:
        if screenshot is None:
            return None

        # Read first chunk for magic bytes detection
        first_chunk = screenshot.file.read(16)
        if not first_chunk:
            return None

        ext = self.detect_file_extension(first_chunk)
        if ext is None:
            raise BadRequestError(
                "Invalid file type. Only PNG, JPEG, WebP or PDF allowed.",
                error_code="INVALID_FILE_TYPE",
            )

        # Read remainder and verify file size
        rest = screenshot.file.read(MAX_FILE_SIZE - len(first_chunk) + 1)
        full_content = first_chunk + rest
        if len(full_content) > MAX_FILE_SIZE:
            raise BadRequestError("Screenshot file size exceeds 5 MB limit.", error_code="FILE_TOO_LARGE")

        # Save with random UUID filename under UPLOAD_DIR
        upload_dir = Path(self.settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        random_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = upload_dir / random_filename
        with open(saved_path, "wb") as f:
            f.write(full_content)

        return saved_path.as_posix()

    def manual_submit(
        self,
        user: User,
        package_id: str,
        billing_cycle_raw: str,
        amount_paid: int,
        transaction_id_raw: str,
        payment_date: date,
        payer_name: str | None,
        screenshot: UploadFile | None,
    ) -> PaymentManualSubmitResponse:
        # 1. Email verification check
        if self.settings.require_email_verification and not user.email_verified:
            raise EmailNotVerifiedError()

        # 2. Access status check for client_admin
        client = user.client
        if client is None or client.access_status not in (
            AccessStatus.PENDING_PAYMENT,
            AccessStatus.PAYMENT_REVIEW,
            AccessStatus.DECLINED,
        ):
            raise PaymentNotAllowedError()

        # 3. Transaction ID validation: 8 to 20 letters and digits
        transaction_id = transaction_id_raw.strip()
        if not TRANSACTION_ID_REGEX.match(transaction_id):
            raise BadRequestError(
                "Transaction ID must be 8 to 20 alphanumeric characters.",
                error_code="INVALID_TRANSACTION_ID",
            )

        # 4. Check duplicate transaction_id (case-insensitive)
        existing_tx = self.db.scalar(
            select(Payment).where(func.lower(Payment.transaction_id) == transaction_id.lower())
        )
        if existing_tx is not None:
            raise TransactionDuplicateError()

        # 5. Payment date validation (cannot be in the future)
        today = date.today()
        if payment_date > today:
            raise BadRequestError(
                "Payment date cannot be in the future.",
                error_code="INVALID_PAYMENT_DATE",
            )

        # 6. Billing cycle validation
        try:
            billing_cycle = BillingCycle(billing_cycle_raw.strip().lower())
        except ValueError:
            raise BadRequestError(
                "Billing cycle must be either 'monthly' or 'yearly'.",
                error_code="INVALID_BILLING_CYCLE",
            )

        # 7. Plan lookup
        package_key = package_id.strip().lower()
        plan = self.db.scalar(select(Plan).where(Plan.key == package_key))
        if plan is None and package_id.isdigit():
            plan = self.db.get(Plan, int(package_id))
        if plan is None:
            raise BadRequestError(f"Plan '{package_id}' not found.", error_code="PLAN_NOT_FOUND")

        # 8. Price comparison and amount_mismatch calculation
        expected_amount = (
            plan.monthly_price if billing_cycle == BillingCycle.MONTHLY else plan.yearly_price
        ) or 0
        amount_mismatch = (amount_paid != expected_amount)

        # 9. Handle screenshot file upload
        screenshot_path = self.save_screenshot(screenshot)

        # 10. Create payment record
        payment = Payment(
            client_id=client.id,
            plan_key=plan.key,
            billing_cycle=billing_cycle,
            amount_expected=expected_amount,
            amount_paid=amount_paid,
            transaction_id=transaction_id,
            payment_date=payment_date,
            payer_name=payer_name.strip() if payer_name else None,
            screenshot_path=screenshot_path,
            status=PaymentStatus.PENDING_VERIFICATION,
            amount_mismatch=amount_mismatch,
            reviewed_by=None,
            reviewed_at=None,
            rejection_reason=None,
        )
        self.db.add(payment)

        # 11. Update client access status & onboarding stage
        client.access_status = AccessStatus.PAYMENT_REVIEW
        client.onboarding_stage = OnboardingStage.AWAITING_PAYMENT_VERIFICATION

        # 12. Store chosen plan & cycle in pending subscription
        pending_sub = self.db.scalar(
            select(Subscription).where(
                Subscription.client_id == client.id,
                Subscription.status == SubscriptionStatus.PENDING,
            )
        )
        now = datetime.now(timezone.utc)
        period_days = 30 if billing_cycle == BillingCycle.MONTHLY else 365
        renews_on = now + timedelta(days=period_days)

        if pending_sub is not None:
            pending_sub.plan_id = plan.id
            pending_sub.billing_cycle = billing_cycle
            pending_sub.period_start = now
            pending_sub.renews_on = renews_on
        else:
            pending_sub = Subscription(
                client_id=client.id,
                plan_id=plan.id,
                billing_cycle=billing_cycle,
                status=SubscriptionStatus.PENDING,
                period_start=now,
                renews_on=renews_on,
            )
            self.db.add(pending_sub)

        self.db.commit()
        self.db.refresh(payment)

        submission_id = f"TALKAOR-UPI-{payment.id:06d}"
        return PaymentManualSubmitResponse(
            success=True,
            submissionId=submission_id,
            message="Payment submitted successfully. Verification takes up to 24 hours.",
            status="pending_manual_verification",
            source="backend",
        )
