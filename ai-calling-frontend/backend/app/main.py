from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import JSONResponse
import uvicorn

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.api.v1.endpoints import (
    auth, dashboard, appointments, customers,
    calls, cancellations, agents, users, clients,
    admin, super_admin
)

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TalkAor AI Voice Calling SaaS Platform API with Multi-Tenant Isolation & Role-Based Access Control",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "TalkAor FastAPI Backend",
        "version": settings.VERSION
    }

# Mount API Routers under /api/v1
api_prefix = settings.API_V1_STR

app.include_router(auth.router, prefix=f"{api_prefix}/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix=f"{api_prefix}/dashboard", tags=["Dashboard"])
app.include_router(appointments.router, prefix=f"{api_prefix}/appointments", tags=["Appointments"])
app.include_router(customers.router, prefix=f"{api_prefix}/customers", tags=["Customers"])
app.include_router(calls.router, prefix=f"{api_prefix}/calls", tags=["Calls & Recordings"])
app.include_router(cancellations.router, prefix=f"{api_prefix}/cancellations", tags=["Cancellations"])
app.include_router(agents.router, prefix=f"{api_prefix}/agents", tags=["AI Agents"])
app.include_router(users.router, prefix=f"{api_prefix}/users", tags=["Staff Management"])
app.include_router(clients.router, prefix=f"{api_prefix}/clients", tags=["Business Profile"])
app.include_router(admin.router, prefix=f"{api_prefix}/admin", tags=["Business Admin Control Center"])
app.include_router(super_admin.router, prefix=f"{api_prefix}/super-admin", tags=["Super Admin Platform Control"])

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
