from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import uuid
import datetime
from backend.app.schemas.schemas import CustomerOut, CustomerCreate, CustomerUpdate
from backend.app.api.deps import get_current_user, get_tenant_business_id
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_customers(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM customers WHERE client_id = ?"
    params = [client_id]

    if search:
        query += " AND (LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search}%", f"%{search.lower()}%"])

    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    data = []
    for r in rows:
        c_dict = dict(r)
        # Count total appointments
        cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE customer_id = ? AND client_id = ?", (c_dict["id"], client_id))
        c_dict["total_appointments"] = cursor.fetchone()["c"]
        data.append(c_dict)

    conn.close()

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

@router.post("", response_model=CustomerOut)
def create_customer(
    req: CustomerCreate,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    cust_id = f"cust-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO customers (id, client_id, name, phone, email, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (cust_id, client_id, req.name, req.phone, req.email, req.notes, now))

    conn.commit()
    cursor.execute("SELECT * FROM customers WHERE id = ?", (cust_id,))
    new_c = dict(cursor.fetchone())
    conn.close()
    new_c["total_appointments"] = 0
    return new_c

@router.patch("/{id}", response_model=CustomerOut)
def update_customer(
    id: str,
    req: CustomerUpdate,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    updates = []
    params = []
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name)
    if req.phone is not None:
        updates.append("phone = ?")
        params.append(req.phone)
    if req.email is not None:
        updates.append("email = ?")
        params.append(req.email)
    if req.notes is not None:
        updates.append("notes = ?")
        params.append(req.notes)

    if updates:
        params.extend([id, client_id])
        cursor.execute(f"UPDATE customers SET {', '.join(updates)} WHERE id = ? AND client_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM customers WHERE id = ?", (id,))
    updated_c = dict(cursor.fetchone())
    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE customer_id = ? AND client_id = ?", (id, client_id))
    updated_c["total_appointments"] = cursor.fetchone()["c"]
    conn.close()

    return updated_c

@router.delete("/{id}")
def delete_customer(
    id: str,
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = ? AND client_id = ?", (id, client_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    # Check for active bookings
    cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE customer_id = ? AND client_id = ? AND status IN ('scheduled', 'confirmed', 'rescheduled')", (id, client_id))
    active_count = cursor.fetchone()["c"]

    if active_count > 0:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete customer with active bookings."
        )

    cursor.execute("DELETE FROM customers WHERE id = ? AND client_id = ?", (id, client_id))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Customer deleted successfully."}
