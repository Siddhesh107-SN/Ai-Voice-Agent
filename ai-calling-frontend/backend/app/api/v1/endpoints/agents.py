from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import json
import uuid
import datetime
from backend.app.schemas.schemas import (
    AgentOut, AgentCreate, AgentUpdate, AgentStatusToggle
)
from backend.app.api.deps import (
    get_current_user, get_tenant_business_id, require_business_admin, create_audit_log
)
from backend.app.db.database import get_db_connection

router = APIRouter()

@router.get("")
def list_agents(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM agents WHERE client_id = ?"
    params = [client_id]

    if status_filter and status_filter != "all":
        query += " AND status = ?"
        params.append(status_filter)

    query += " ORDER BY created_at ASC LIMIT ? OFFSET ?"
    offset = (page - 1) * limit
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    data = []
    for r in rows:
        a_dict = dict(r)
        if a_dict.get("configuration_json"):
            try:
                a_dict["configuration"] = json.loads(a_dict["configuration_json"])
            except Exception:
                a_dict["configuration"] = {}
        else:
            a_dict["configuration"] = {}
        data.append(a_dict)

    return {
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": len(data),
            "total_pages": 1
        }
    }

@router.post("", response_model=AgentOut)
def create_agent(
    req: AgentCreate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    agent_id = f"agent-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    config_json = json.dumps(req.configuration or {"temperature": 0.3, "recording_enabled": True})

    cursor.execute("""
    INSERT INTO agents (
        id, client_id, name, description, phone_number, provider, status,
        configuration_json, created_at, last_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        agent_id, client_id, req.name, req.description, req.phone_number,
        req.provider, req.status, config_json, now, now
    ))
    conn.commit()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    row = dict(cursor.fetchone())
    conn.close()
    row["configuration"] = json.loads(row["configuration_json"])

    create_audit_log(
        level="INFO",
        service="Agent Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="AI Agent Created",
        status_str="SUCCESS",
        details=f"AI Voice Agent {req.name} ({agent_id}) deployed.",
        endpoint="/api/v1/agents",
        http_method="POST",
        status_code=201
    )

    return row

@router.patch("/{id}", response_model=AgentOut)
def update_agent(
    id: str,
    req: AgentUpdate,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="AI Agent not found")

    updates = []
    params = []
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name)
    if req.description is not None:
        updates.append("description = ?")
        params.append(req.description)
    if req.phone_number is not None:
        updates.append("phone_number = ?")
        params.append(req.phone_number)
    if req.provider is not None:
        updates.append("provider = ?")
        params.append(req.provider)
    if req.status is not None:
        updates.append("status = ?")
        params.append(req.status)
    if req.configuration is not None:
        updates.append("configuration_json = ?")
        params.append(json.dumps(req.configuration))

    if updates:
        params.extend([id, client_id])
        cursor.execute(f"UPDATE agents SET {', '.join(updates)} WHERE id = ? AND client_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (id,))
    updated_agent = dict(cursor.fetchone())
    conn.close()
    if updated_agent.get("configuration_json"):
        updated_agent["configuration"] = json.loads(updated_agent["configuration_json"])

    return updated_agent

@router.patch("/{id}/status")
def toggle_agent_status(
    id: str,
    req: AgentStatusToggle,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    """
    Business Admin toggle for AI Agent ON/OFF state.
    Enforces business isolation and records audit log.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="AI Agent not found or access denied")

    agent = dict(row)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_status = req.status
    health_status = "HEALTHY" if new_status == "active" else "OFFLINE"

    cursor.execute("""
    UPDATE agents SET status = ?, health = ?, last_active = ? WHERE id = ? AND client_id = ?
    """, (new_status, health_status, now, id, client_id))
    conn.commit()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (id,))
    updated_row = dict(cursor.fetchone())
    conn.close()
    if updated_row.get("configuration_json"):
        updated_row["configuration"] = json.loads(updated_row["configuration_json"])

    # Audit log
    create_audit_log(
        level="INFO",
        service="Agent Service",
        business_id=client_id,
        business_name="Business",
        user_id=current_user["id"],
        user_name=current_user["name"],
        role=current_user["role"],
        event="AI Agent Status Toggled",
        status_str="SUCCESS",
        details=f"AI Agent {agent['name']} ({id}) status turned {new_status.upper()} by {current_user['name']}.",
        endpoint=f"/api/v1/agents/{id}/status",
        http_method="PATCH",
        status_code=200,
        metadata={"previous_status": agent["status"], "new_status": new_status}
    )

    return {
        "success": True,
        "message": f"AI Agent '{agent['name']}' is now {new_status.upper()}.",
        "agent": updated_row
    }

@router.delete("/{id}")
def delete_agent(
    id: str,
    current_user: dict = Depends(require_business_admin),
    client_id: str = Depends(get_tenant_business_id)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ? AND client_id = ?", (id, client_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="AI Agent not found")

    cursor.execute("DELETE FROM agents WHERE id = ? AND client_id = ?", (id, client_id))
    conn.commit()
    conn.close()
    return {"success": True, "message": "AI Agent deleted successfully."}
