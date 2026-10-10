from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from typing import Optional
import json
from backend.app.schemas.schemas import CallOut
from backend.app.api.deps import (
    get_current_user, get_tenant_business_id, require_business_admin, create_audit_log
)
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_calls(
    status_filter: Optional[str] = Query(None, alias="status"),
    agent: Optional[str] = None,
    customer: Optional[str] = None,
    direction: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM calls WHERE client_id = ?"
    params = [client_id]

    if status_filter and status_filter != "all":
        query += " AND status = ?"
        params.append(status_filter)

    if agent and agent != "all":
        query += " AND (agent_id = ? OR agent_name LIKE ?)"
        params.extend([agent, f"%{agent}%"])

    if direction and direction != "all":
        query += " AND direction = ?"
        params.append(direction)

    if customer:
        query += " AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)"
        params.extend([f"%{customer.lower()}%", f"%{customer}%"])

    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    query += " ORDER BY date_time DESC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    is_admin = current_user.get("role") in ["BUSINESS_ADMIN", "CLIENT_ADMIN", "SUPER_ADMIN"]
    data = []
    for r in rows:
        c_dict = dict(r)
        c_dict["has_recording"] = bool(c_dict["has_recording"])
        c_dict["has_transcript"] = bool(c_dict["has_transcript"])

        # Parse transcript JSON if present
        if c_dict.get("transcript_json"):
            try:
                c_dict["transcript"] = json.loads(c_dict["transcript_json"])
            except Exception:
                c_dict["transcript"] = []
        else:
            c_dict["transcript"] = []

        # Redact recordings and transcripts for staff users (Req #24)
        if not is_admin:
            c_dict["recording_url"] = None
            c_dict["has_recording"] = False
            c_dict["transcript"] = None
            c_dict["has_transcript"] = False

        data.append(c_dict)

    total_pages = max(1, (total + limit - 1) // limit)
    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }

@router.get("/{id}")
def get_call(
    id: str,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM calls WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Call record not found")

    c_dict = dict(row)
    c_dict["has_recording"] = bool(c_dict["has_recording"])
    c_dict["has_transcript"] = bool(c_dict["has_transcript"])
    if c_dict.get("transcript_json"):
        try:
            c_dict["transcript"] = json.loads(c_dict["transcript_json"])
        except Exception:
            c_dict["transcript"] = []

    is_admin = current_user.get("role") in ["BUSINESS_ADMIN", "CLIENT_ADMIN", "SUPER_ADMIN"]
    if not is_admin:
        c_dict["recording_url"] = None
        c_dict["has_recording"] = False
        c_dict["transcript"] = None
        c_dict["has_transcript"] = False

    return c_dict

@router.get("/{id}/recording")
def get_call_recording(
    id: str,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    """
    Secure endpoint providing authorized access to call recordings.
    Enforces business tenant isolation so Business A cannot access Business B recordings.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM calls WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Recording not found or access denied")

    c_dict = dict(row)
    if not c_dict.get("has_recording") or not c_dict.get("recording_url"):
        raise HTTPException(status_code=404, detail="No recording attached to this call")

    create_audit_log(
        level="INFO",
        service="Recording Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Recording Accessed",
        status_str="SUCCESS",
        details=f"Audio recording accessed for call {id} by {current_user['name']}.",
        endpoint=f"/api/v1/calls/{id}/recording",
        http_method="GET",
        status_code=200
    )

    return {
        "call_id": id,
        "recording_url": c_dict["recording_url"],
        "duration_seconds": c_dict["duration_seconds"],
        "customer_name": c_dict["customer_name"],
        "authorized": True
    }
