from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.enums import AccessStatus
from app.models.payment import Payment
from app.models.user import User
from app.schemas.onboarding import OnboardingStatusResponse


class OnboardingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_status(self, user: User) -> OnboardingStatusResponse:
        client = user.client
        if client is None:
            # Fallback query if not joined
            client = self.db.get(Client, user.client_id)

        latest_payment = self.db.scalar(
            select(Payment)
            .where(Payment.client_id == client.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(1)
        )

        if latest_payment is None:
            payment_status = "awaiting_submission"
            package_name = None
            amount = None
            submitted_at = None
            transaction_ref = None
            rejection_reason = None
        else:
            payment_status = latest_payment.status.value
            package_name = latest_payment.plan_key
            amount = latest_payment.amount_paid
            submitted_at = latest_payment.created_at
            transaction_ref = latest_payment.transaction_id
            rejection_reason = latest_payment.rejection_reason

        onboarding_stage = client.onboarding_stage.value if client.onboarding_stage else None
        dashboard_access_granted = (client.access_status == AccessStatus.ACTIVE)

        return OnboardingStatusResponse(
            payment_status=payment_status,
            onboarding_stage=onboarding_stage,
            business_name=client.business_name,
            package_name=package_name,
            amount=amount,
            currency="INR",
            submitted_at=submitted_at,
            transaction_ref=transaction_ref,
            rejection_reason=rejection_reason,
            dashboard_access_granted=dashboard_access_granted,
        )
