from fastapi import APIRouter, Request, status

from app.core.dependencies import DbSession
from app.core.rate_limit import limiter
from app.schemas.contact import ContactSubmitRequest
from app.services.admin_service import AdminService

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def submit_contact_form(request: Request, body: ContactSubmitRequest, db: DbSession):
    """Public contact form with spam honeypot and IP rate limiting (5/hr)."""
    return AdminService(db).submit_contact(
        name=body.name,
        email=body.email,
        phone=body.phone,
        message=body.message,
        website=body.website,
    )
