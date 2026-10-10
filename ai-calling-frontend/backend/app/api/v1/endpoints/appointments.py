from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import uuid
import datetime
from backend.app.schemas.schemas import (
    AppointmentOut, AppointmentCreate, AppointmentUpdate,
    AppointmentReschedule, AppointmentCancel, AppointmentHistoryOut
)
from backend.app.api.deps import (
    get_current_user, get_tenant_business_id, create_audit_log
)
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_appointments(
    status_filter: Optional[str] = Query(None, alias="status"),
    date: Optional[str] = None,
    customer: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM appointments WHERE client_id = ?"
    params = [client_id]

    if status_filter and status_filter != "all":
        query += " AND status = ?"
        params.append(status_filter)

    if date:
        query += " AND date = ?"
        params.append(date)

    if customer:
        query += " AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)"
        params.extend([f"%{customer.lower()}%", f"%{customer}%"])

    # Count
    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    # Pagination & sorting
    query += " ORDER BY date DESC, time DESC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    total_pages = max(1, (total + limit - 1) // limit)
    data = [dict(r) for r in rows]

    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }

@router.post("", response_model=AppointmentOut)
def create_appointment(
    req: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    apt_id = f"apt-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cust_id = req.customer_id or f"cust-{uuid.uuid4().hex[:6]}"

    # Calculate day of week
    try:
        dt = datetime.datetime.strptime(req.date, "%Y-%m-%d")
        day_of_week = dt.strftime("%A")
    except Exception:
        day_of_week = "Monday"

    cursor.execute("""
    INSERT INTO appointments (
        id, client_id, customer_id, customer_name, customer_phone, customer_email,
        date, time, day_of_week, service, status, staff_id, staff_name,
        notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)
    """, (
        apt_id, client_id, cust_id, req.customer_name, req.customer_phone,
        req.customer_email, req.date, req.time, day_of_week, req.service,
        current_user["id"], current_user["name"], req.notes, now, now
    ))

    # Add history record
    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Appointment Created', NULL, ?, ?, 'staff', ?)
    """, (hist_id, apt_id, f"{req.date} at {req.time}", current_user["name"], now))

    conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,))
    new_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Appointment Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Appointment Created",
        status_str="SUCCESS",
        details=f"Appointment {apt_id} created for {req.customer_name} on {req.date} at {req.time}.",
        endpoint="/api/v1/appointments",
        http_method="POST",
        status_code=201
    )

    return new_apt

@router.patch("/{id}", response_model=AppointmentOut)
def update_appointment(
    id: str,
    req: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

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
    if req.customer_email is not None:
        updates.append("customer_email = ?")
        params.append(req.customer_email)
    if req.service is not None:
        updates.append("service = ?")
        params.append(req.service)
    if req.status is not None:
        updates.append("status = ?")
        params.append(req.status)
        # Log history if status changed
        hist_id = f"hist-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
        VALUES (?, ?, 'Status Changed', ?, ?, ?, 'staff', ?)
        """, (hist_id, id, old_apt["status"], req.status, current_user["name"], now))

    if req.notes is not None:
        updates.append("notes = ?")
        params.append(req.notes)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(id)
        params.append(client_id)
        cursor.execute(f"UPDATE appointments SET {', '.join(updates)} WHERE id = ? AND client_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    return updated_apt

@router.post("/{id}/cancel")
def cancel_appointment(
    id: str,
    req: AppointmentCancel,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

    apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    reason = req.reason or "Cancelled by user"

    # Update appointment status
    cursor.execute("UPDATE appointments SET status = 'cancelled', updated_at = ? WHERE id = ?", (now, id))

    # Add cancellation record
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

    # Add history
    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Cancelled', ?, ?, ?, 'staff', ?)
    """, (hist_id, id, apt["status"], reason, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Appointment Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Appointment Cancelled",
        status_str="SUCCESS",
        details=f"Appointment {id} for {apt['customer_name']} cancelled. Reason: {reason}",
        endpoint=f"/api/v1/appointments/{id}/cancel",
        http_method="POST",
        status_code=200
    )

    return {
        "message": "Appointment cancelled successfully.",
        "appointment": updated_apt
    }

@router.post("/{id}/reschedule")
def reschedule_appointment(
    id: str,
    req: AppointmentReschedule,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

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
    WHERE id = ?
    """, (req.new_date, req.new_time, day_of_week, now, id))

    # Add history
    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    hist_note = f"{new_slot} ({req.reason})" if req.reason else new_slot
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Rescheduled', ?, ?, ?, 'staff', ?)
    """, (hist_id, id, old_slot, hist_note, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Appointment Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Appointment Rescheduled",
        status_str="SUCCESS",
        details=f"Appointment {id} rescheduled from {old_slot} to {new_slot}. Reason: {req.reason or 'None'}",
        endpoint=f"/api/v1/appointments/{id}/reschedule",
        http_method="POST",
        status_code=200
    )

    return {
        "message": "Appointment rescheduled successfully.",
        "appointment": updated_apt
    }

@router.post("/{id}/restore")
def restore_appointment(
    id: str,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    """Restore a previously cancelled appointment to scheduled status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

    apt = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("UPDATE appointments SET status = 'scheduled', updated_at = ? WHERE id = ?", (now, id))

    # Remove from cancellations table
    cursor.execute("DELETE FROM cancellations WHERE appointment_id = ?", (id,))

    # Add history
    hist_id = f"hist-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO appointment_history (id, appointment_id, event, old_value, new_value, actor, actor_type, timestamp)
    VALUES (?, ?, 'Restored', 'cancelled', 'scheduled', ?, 'staff', ?)
    """, (hist_id, id, current_user["name"], now))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (id,))
    updated_apt = dict(cursor.fetchone())
    conn.close()

    create_audit_log(
        level="INFO",
        service="Appointment Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Appointment Restored",
        status_str="SUCCESS",
        details=f"Cancelled appointment {id} restored back to active scheduled status by {current_user['name']}.",
        endpoint=f"/api/v1/appointments/{id}/restore",
        http_method="POST",
        status_code=200
    )

    return {
        "message": "Appointment successfully restored.",
        "appointment": updated_apt
    }

@router.get("/{id}/history")
def get_appointment_history(
    id: str,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Verify appointment belongs to business
    cursor.execute("SELECT id FROM appointments WHERE id = ? AND client_id = ?", (id, client_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

    cursor.execute("SELECT * FROM appointment_history WHERE appointment_id = ? ORDER BY timestamp DESC", (id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
