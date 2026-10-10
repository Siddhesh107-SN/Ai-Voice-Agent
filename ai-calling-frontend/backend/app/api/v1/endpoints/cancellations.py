from fastapi import APIRouter, Depends, Query
from typing import Optional
from backend.app.api.deps import get_current_user, get_tenant_business_id
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_cancellations(
    customer: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM cancellations WHERE client_id = ?"
    params = [client_id]

    if customer:
        query += " AND (LOWER(customer_name) LIKE ? OR customer_phone LIKE ?)"
        params.extend([f"%{customer.lower()}%", f"%{customer}%"])

    if source and source != "all":
        query += " AND cancelled_by = ?"
        params.append(source)

    if date_from:
        query += " AND timestamp >= ?"
        params.append(date_from)

    if date_to:
        query += " AND timestamp <= ?"
        params.append(date_to)

    count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
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
