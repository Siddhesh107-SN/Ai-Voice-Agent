"""Liveness/readiness probe. Deliberately cheap (one SELECT 1) so it's safe to poll often."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("/health")
def health(response: Response, db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        db_status = "up"
    except Exception:  # noqa: BLE001 — health checks must never raise, only report
        db_status = "down"

    healthy = db_status == "up"
    response.status_code = 200 if healthy else 503
    return {"success": healthy, "message": "OK" if healthy else "Service unavailable",
            "data": {"status": "healthy" if healthy else "unhealthy", "database": db_status}}
