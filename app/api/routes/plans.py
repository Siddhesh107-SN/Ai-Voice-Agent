from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.schemas.billing import PlanOut
from app.services.billing_service import BillingService

router = APIRouter()


@router.get("", response_model=list[PlanOut])
def list_plans(db: DbSession):
    """Public list of active plans for pricing and signup pages."""
    return BillingService(db).list_plans()
