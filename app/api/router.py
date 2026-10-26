"""Root API router. Each stage adds its routers under /api/v1."""
from fastapi import APIRouter, Request

from app.api.routes import (admin, agents, appointments, auth, billing,
                            business, calls, cancellations, clients, contact,
                            customers, dashboard, email_verification, health,
                            onboarding, payments, pin, plans, sarvam_webhooks,
                            users, webhooks)
from app.core.dependencies import SuperAdminUser

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(email_verification.router, prefix="/auth/verify-email", tags=["auth"])
api_router.include_router(pin.router, prefix="/pin", tags=["pin"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(business.router, prefix="/business", tags=["business"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(contact.router, prefix="/contact", tags=["contact"])

api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(cancellations.router, prefix="/cancellations", tags=["cancellations"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(sarvam_webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])


@api_router.get("/openapi.json", include_in_schema=False)
def get_guarded_openapi_json(request: Request, user: SuperAdminUser):
    """Serve the complete OpenAPI schema guarded by super_admin."""
    return request.app.openapi()
