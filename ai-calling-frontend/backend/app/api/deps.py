from fastapi import Depends, HTTPException, status, Header, Request
from typing import Optional, List, Dict, Any
import datetime
import uuid
import json
from app.core.security import decode_token
from app.db.database import get_db_connection

def get_token_from_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ")[1]

def get_current_user(token: str = Depends(get_token_from_header)) -> dict:
    try:
        payload = decode_token(token)
    except ValueError as e:
        if str(e) == "TOKEN_EXPIRED":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="TOKEN_EXPIRED",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    user = dict(row)
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated",
        )

    # Normalize roles for compatibility
    role = user.get("role", "")
    if role == "CLIENT_ADMIN":
        user["role"] = "BUSINESS_ADMIN"
    elif role == "CLIENT_STAFF":
        user["role"] = "STAFF"

    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        # Check normalized and raw roles
        if user_role not in allowed_roles:
            # Map equivalents
            is_allowed = False
            for r in allowed_roles:
                if r == "BUSINESS_ADMIN" and user_role in ["CLIENT_ADMIN", "BUSINESS_ADMIN"]:
                    is_allowed = True
                elif r == "STAFF" and user_role in ["CLIENT_STAFF", "STAFF"]:
                    is_allowed = True
                elif r == "SUPER_ADMIN" and user_role == "SUPER_ADMIN":
                    is_allowed = True
            
            if not is_allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: Insufficient privileges. Required one of: {allowed_roles}",
                )
        return current_user
    return role_checker

def require_business_admin(current_user: dict = Depends(require_roles(["BUSINESS_ADMIN", "SUPER_ADMIN"]))):
    return current_user

def require_super_admin(current_user: dict = Depends(require_roles(["SUPER_ADMIN"]))):
    return current_user

def get_tenant_business_id(current_user: dict = Depends(get_current_user)) -> str:
    """Returns the business/client_id for the current user. For SUPER_ADMIN, allows platform override."""
    return current_user.get("client_id", "")

def create_audit_log(
    level: str,
    service: str,
    business_id: Optional[str],
    business_name: str,
    user_id: Optional[str],
    user_name: str,
    role: str,
    event: str,
    status_str: str,
    details: str,
    endpoint: Optional[str] = None,
    http_method: Optional[str] = None,
    status_code: Optional[int] = None,
    error_message: Optional[str] = None,
    stack_trace: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        log_id = f"log-{uuid.uuid4().hex[:10]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        req_id = f"req-{uuid.uuid4().hex[:8]}"

        cursor.execute("""
        INSERT INTO audit_logs (id, timestamp, level, service, business_id, business_name, user_id, user_name, role, event, status, details, request_id, endpoint, http_method, status_code, error_message, stack_trace, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            log_id, now, level, service, business_id, business_name, user_id, user_name,
            role, event, status_str, details, req_id, endpoint, http_method,
            status_code, error_message, stack_trace, json.dumps(metadata) if metadata else None
        ))
        conn.commit()
    except Exception as e:
        print(f"Failed to record audit log: {e}")
    finally:
        if conn:
            conn.close()
