"""Root API router. Each stage adds its routers under /api/v1."""
from fastapi import APIRouter

from app.api.routes import agents, appointments, auth, calls, cancellations, clients, customers, dashboard, health, \
    users, webhooks

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(cancellations.router, prefix="/cancellations", tags=["cancellations"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
