from fastapi import APIRouter

from app.core.dependencies import DbSession, PendingOrActiveClientUser
from app.schemas.onboarding import OnboardingStatusResponse
from app.services.onboarding_service import OnboardingService

router = APIRouter()


@router.get("/status", response_model=OnboardingStatusResponse)
def get_onboarding_status(user: PendingOrActiveClientUser, db: DbSession):
    """Retrieve current onboarding & payment status for the caller's tenant."""
    return OnboardingService(db).get_status(user)
