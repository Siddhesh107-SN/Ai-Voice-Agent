from fastapi import APIRouter, Depends, HTTPException
import json
from backend.app.schemas.schemas import BusinessProfileOut, BusinessProfileUpdate
from backend.app.api.deps import get_current_user, get_tenant_business_id, require_business_admin, create_audit_log
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("/me", response_model=BusinessProfileOut)
def get_my_business(
    current_user: dict = Depends(get_current_user),
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

@router.patch("/me", response_model=BusinessProfileOut)
def update_my_business(
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
        service="Business Profile",
        business_id=client_id,
        business_name=updated_b["business_name"],
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="Business Profile Updated",
        status_str="SUCCESS",
        details=f"Business profile settings updated by {current_user['name']}.",
        endpoint="/api/v1/clients/me",
        http_method="PATCH",
        status_code=200
    )

    return updated_b
