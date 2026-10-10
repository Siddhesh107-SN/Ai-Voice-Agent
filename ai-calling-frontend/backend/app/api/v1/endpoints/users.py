from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import uuid
import datetime
from backend.app.schemas.schemas import UserOut, StaffCreate, StaffUpdate
from backend.app.api.deps import get_current_user, get_tenant_business_id, require_business_admin
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM users WHERE client_id = ?"
    params = [client_id]

    if role:
        query += " AND role = ?"
        params.append(role)

    if is_active is not None:
        query += " AND is_active = ?"
        params.append(1 if is_active else 0)

    query += " ORDER BY created_at ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    data = [
        {
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "role": r["role"],
            "client_id": r["client_id"],
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]

    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": len(data),
            "total_pages": 1
        }
    }

@router.post("", response_model=UserOut)
def create_user(
    req: StaffCreate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (req.email.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user_id = f"user-staff-{uuid.uuid4().hex[:6]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pass_hash = req.password or "staff123"

    cursor.execute("""
    INSERT INTO users (id, client_id, name, email, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    """, (user_id, client_id, req.name, req.email.lower(), pass_hash, req.role, now))
    conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = dict(cursor.fetchone())
    conn.close()

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "client_id": row["client_id"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }

@router.patch("/{id}", response_model=UserOut)
def update_user(
    id: str,
    req: StaffUpdate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    if id == current_user["id"]:
        if req.role is not None or req.is_active is not None:
            raise HTTPException(
                status_code=400,
                detail="You cannot modify your own role or active status."
            )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    updates = []
    params = []
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name)
    if req.role is not None:
        updates.append("role = ?")
        params.append(req.role)
    if req.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if req.is_active else 0)

    if updates:
        params.extend([id, client_id])
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ? AND client_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (id,))
    updated = dict(cursor.fetchone())
    conn.close()

    return {
        "id": updated["id"],
        "name": updated["name"],
        "email": updated["email"],
        "role": updated["role"],
        "client_id": updated["client_id"],
        "is_active": bool(updated["is_active"]),
        "created_at": updated["created_at"],
    }
