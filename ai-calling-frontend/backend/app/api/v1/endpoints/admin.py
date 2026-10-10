from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import json
import uuid
import datetime
from backend.app.schemas.schemas import (
    AppointmentOut, AppointmentUpdate, AppointmentReschedule,
    AppointmentCancel, AgentStatusToggle, BusinessProfileOut,
    BusinessProfileUpdate
)
from backend.app.api.deps import (
    get_current_user, get_tenant_business_id, require_business_admin, create_audit_log
)
from backend.app.db.database import get_db_connection

router = APIRouter()

# 1. APPOINTMENTS
@router.get("/appointments")
def admin_get_appointments(
    status_filter: Optional[str] = Query(None, alias="status"),
    customer: Optional[str] = None,
    date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    """Business Admin view of all appointments belonging to their business."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM appointments WHERE client_id = ?"
    params = [client_id]

    if status_filter and status_filter != "all":
        query += " AND status = ?"
        params.append(status_filter)

    if customer:
        query += " AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)"
        params.extend([f"%{customer.lower()}%", f"%{customer}%"])

    if date:
        query += " AND date = ?"
        params.append(date)

    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    query += " ORDER BY date DESC, time DESC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    total_pages = max(1, (total + limit - 1) // limit)
    return {
        "data": [dict(r) for r in rows],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }

@router.patch("/appointments/{id}", response_model=AppointmentOut)
def admin_update_appointment(
    id: str,
    req: AppointmentUpdate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or unauthorized")

    old_apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    updates = []
    params = []
    if req.customer_name is not None:
        updates.append("customer_name = ?")
        params.append(req.customer_name)
    if req.customer_phone is not None:
        updates.append("customer_phone = ?")
        params.append(req.customer_phone)
    if req.service is not None:
        updates.append("service = ?")
        params.append(req.service)
    if req.status is not None:
        updates.append("status = ?")
        params.append(req.status)
        # Log history
        hist_id = f"hist-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
        VALUES (?, ?, 'Admin Status Update', ?, ?, ?, 'staff', ?)
        """, (hist_id, id, old_apt["status"], req.status, current_user["name"], now))

    if req.notes is not None:
        updates.append("notes = ?")
        params.append(req.notes)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.extend([id, client_id])
        cursor.execute(f"UPDATE appointments SET {', '.join(updates)} WHERE id = ? AND client_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Appointment Modified",
        status_str="SUCCESS",
        details=f"Admin updated appointment {id} details.",
        endpoint=f"/api/v1/admin/appointments/{id}",
        http_method="PATCH",
        status_code=200
    )

    return updated_apt

@router.post("/appointments/{id}/reschedule")
def admin_reschedule_appointment(
    id: str,
    req: AppointmentReschedule,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or unauthorized")

    apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_slot = f"{apt['date']} at {apt['time']}"
    new_slot = f"{req.new_date} at {req.new_time}"

    try:
        dt = datetime.datetime.strptime(req.new_date, "%Y-%m-%d")
        day_of_week = dt.strftime("%A")
    except Exception:
        day_of_week = apt["day_of_week"]

    cursor.execute("""
    UPDATE appointments
    SET date = ?, time = ?, day_of_week = ?, status = 'rescheduled', updated_at = ?
    WHERE id = ? AND client_id = ?
    """, (req.new_date, req.new_time, day_of_week, now, id, client_id))

    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    hist_val = f"{new_slot} ({req.reason})" if req.reason else new_slot
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Admin Rescheduled', ?, ?, ?, 'staff', ?)
    """, (hist_id, id, old_slot, hist_val, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Rescheduled Appointment",
        status_str="SUCCESS",
        details=f"Admin rescheduled appointment {id} from {old_slot} to {new_slot}.",
        endpoint=f"/api/v1/admin/appointments/{id}/reschedule",
        http_method="POST",
        status_code=200,
        metadata={"previous_slot": old_slot, "new_slot": new_slot}
    )

    return {
        "message": "Appointment rescheduled successfully.",
        "appointment": updated_apt,
        "previous_slot": old_slot,
        "new_slot": new_slot
    }

@router.post("/appointments/{id}/cancel")
def admin_cancel_appointment(
    id: str,
    req: AppointmentCancel,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or unauthorized")

    apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    reason = req.reason or "Cancelled by Administrator"

    cursor.execute("UPDATE appointments SET status = 'cancelled', updated_at = ? WHERE id = ? AND client_id = ?", (now, id, client_id))

    canc_id = f"canc-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO cancellations (
        id, client_id, appointment_id, original_date, original_time,
        customer_id, customer_name, customer_phone, reason,
        cancelled_by, cancelled_by_name, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
    """, (
        canc_id, client_id, id, apt["date"], apt["time"],
        apt["customer_id"], apt["customer_name"], apt["customer_phone"],
        reason, current_user["name"], now
    ))

    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Admin Cancelled', ?, ?, ?, 'staff', ?)
    """, (hist_id, id, apt["status"], reason, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Cancelled Appointment",
        status_str="SUCCESS",
        details=f"Admin cancelled appointment {id}. Reason: {reason}",
        endpoint=f"/api/v1/admin/appointments/{id}/cancel",
        http_method="POST",
        status_code=200
    )

    return {
        "message": "Appointment cancelled by Admin.",
        "appointment": updated_apt
    }

@router.post("/appointments/{id}/restore")
def admin_restore_appointment(
    id: str,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found or unauthorized")

    apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("UPDATE appointments SET status = 'scheduled', updated_at = ? WHERE id = ? AND client_id = ?", (now, id, client_id))
    cursor.execute("DELETE FROM cancellations WHERE appointment_id = ? AND client_id = ?", (id, client_id))

    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Admin Restored', 'cancelled', 'scheduled', ?, 'staff', ?)
    """, (hist_id, id, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Restored Appointment",
        status_str="SUCCESS",
        details=f"Cancelled appointment {id} restored back to scheduled by Admin.",
        endpoint=f"/api/v1/admin/appointments/{id}/restore",
        http_method="POST",
        status_code=200
    )

    return {
        "message": "Appointment reopened/restored successfully.",
        "appointment": updated_apt
    }

# 2. VOICE CALLS & RECORDINGS
@router.get("/calls")
def admin_get_calls(
    customer: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM calls WHERE client_id = ?"
    params = [client_id]

    if customer:
        query += " AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)"
        params.extend([f"%{customer.lower()}%", f"%{customer}%"])

    if status_filter and status_filter != "all":
        query += " AND status = ?"
        params.append(status_filter)

    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    query += " ORDER BY date_time DESC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    data = []
    for r in rows:
        c_dict = dict(r)
        c_dict["has_recording"] = bool(c_dict["has_recording"])
        c_dict["has_transcript"] = bool(c_dict["has_transcript"])
        if c_dict.get("transcript_json"):
            try:
                c_dict["transcript"] = json.loads(c_dict["transcript_json"])
            except Exception:
                c_dict["transcript"] = []
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

@router.get("/calls/{id}/recording")
def admin_get_call_recording(
    id: str,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM calls WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Recording not found or access denied")

    c_dict = dict(row)
    if not c_dict.get("has_recording") or not c_dict.get("recording_url"):
        raise HTTPException(status_code=404, detail="No voice recording available for this call")

    create_audit_log(
        level="INFO",
        service="Recording Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Recording Stream",
        status_str="SUCCESS",
        details=f"Admin accessed voice recording for call {id}.",
        endpoint=f"/api/v1/admin/calls/{id}/recording",
        http_method="GET",
        status_code=200
    )

    return {
        "call_id": id,
        "recording_url": c_dict["recording_url"],
        "duration_seconds": c_dict["duration_seconds"],
        "customer_name": c_dict["customer_name"],
        "download_url": c_dict["recording_url"],
        "authorized": True
    }

# 3. AI AGENTS
@router.get("/agents")
def admin_get_agents(
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE client_id = ? ORDER BY created_at ASC", (client_id,))
    rows = cursor.fetchall()
    conn.close()

    data = []
    for r in rows:
        a = dict(r)
        if a.get("configuration_json"):
            try:
                a["configuration"] = json.loads(a["configuration_json"])
            except Exception:
                a["configuration"] = {}
        data.append(a)

    return {"data": data}

@router.patch("/agents/{id}/status")
def admin_toggle_agent_status(
    id: str,
    req: AgentStatusToggle,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="AI Agent not found or unauthorized")

    agent = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_status = req.status
    health_status = "HEALTHY" if new_status == "active" else "OFFLINE"

    cursor.execute("""
    UPDATE agents SET status = ?, health = ?, last_active = ? WHERE id = ? AND client_id = ?
    """, (new_status, health_status, now, id, client_id))
    conn.commit()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (id,))
    updated_agent = dict(cursor.fetchone())
    conn.close()

    if updated_agent.get("configuration_json"):
        updated_agent["configuration"] = json.loads(updated_agent["configuration_json"])

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Toggled Agent Status",
        status_str="SUCCESS",
        details=f"Admin switched AI Agent '{agent['name']}' to {new_status.upper()}.",
        endpoint=f"/api/v1/admin/agents/{id}/status",
        http_method="PATCH",
        status_code=200,
        metadata={"agent_id": id, "previous_status": agent["status"], "new_status": new_status}
    )

    return {
        "success": True,
        "message": f"AI Agent '{agent['name']}' status changed to {new_status.upper()}.",
        "agent": updated_agent
    }

# 4. BUSINESS PROFILE
@router.get("/business", response_model=BusinessProfileOut)
def admin_get_business(
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM businesses WHERE id = ?", (client_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Business profile not found")

    b_dict = dict(row)
    if b_dict.get("services_json"):
        try:
            b_dict["services"] = json.loads(b_dict["services_json"])
        except Exception:
            b_dict["services"] = []
    else:
        b_dict["services"] = []

    return b_dict

@router.patch("/business", response_model=BusinessProfileOut)
def admin_update_business(
    req: BusinessProfileUpdate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM businesses WHERE id = ?", (client_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Business profile not found")

    updates = []
    params = []
    if req.business_name is not None:
        updates.append("business_name = ?")
        params.append(req.business_name)
    if req.phone is not None:
        updates.append("phone = ?")
        params.append(req.phone)
    if req.address is not None:
        updates.append("address = ?")
        params.append(req.address)
    if req.timezone is not None:
        updates.append("timezone = ?")
        params.append(req.timezone)
    if req.logo is not None:
        updates.append("logo = ?")
        params.append(req.logo)
    if req.description is not None:
        updates.append("description = ?")
        params.append(req.description)
    if req.working_hours is not None:
        updates.append("working_hours = ?")
        params.append(req.working_hours)
    if req.services is not None:
        updates.append("services_json = ?")
        params.append(json.dumps(req.services))

    if updates:
        params.append(client_id)
        cursor.execute(f"UPDATE businesses SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM businesses WHERE id = ?", (client_id,))
    updated_b = dict(cursor.fetchone())
    conn.close()

    if updated_b.get("services_json"):
        updated_b["services"] = json.loads(updated_b["services_json"])

    create_audit_log(
        level="INFO",
        service="Admin Controls",
        business_id=client_id,
        business_name=updated_b["business_name"],
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Admin Business Profile Update",
        status_str="SUCCESS",
        details=f"Admin profile modified for {updated_b['business_name']}.",
        endpoint="/api/v1/admin/business",
        http_method="PATCH",
        status_code=200
    )

    return updated_b
