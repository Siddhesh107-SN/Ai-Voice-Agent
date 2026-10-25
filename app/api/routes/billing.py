from fastapi import APIRouter

from app.core.dependencies import ClientMemberUser, DbSession
from app.schemas.billing import BillingMeOut
from app.services.billing_service import BillingService

router = APIRouter()


@router.get("/me", response_model=BillingMeOut)
def get_my_billing(user: ClientMemberUser, db: DbSession):
    """Retrieve billing, usage, limits, and renewal metrics for caller's client."""
    return BillingService(db).get_billing_me(user.client_id)
