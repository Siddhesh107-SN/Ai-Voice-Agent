from fastapi import APIRouter, Depends, HTTPException, status
import datetime
from backend.app.schemas.schemas import (
    LoginRequest, AuthResponse, UserOut, TokenRefreshRequest,
    TokenRefreshResponse, AdminCodeVerifyRequest, AdminCodeVerifyResponse
)
from backend.app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, verify_admin_access_code
)
from backend.app.db.database import get_db_connection
from backend.app.api.deps import get_current_user, create_audit_log

router = APIRouter()

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    email = req.email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    row = cursor.fetchone()

    if not row or not verify_password(req.password, row["password_hash"]):
        conn.close()
        # Audit failed login attempt
        create_audit_log(
            level="WARNING",
            service="Authentication",
            business_id=None,
            business_name="Unknown",
            user_id=None,
            user_name=email,
            role="ANONYMOUS",
            event="Login Failed",
            status_str="FAILED",
            details=f"Failed login attempt for {email} with invalid credentials.",
            endpoint="/api/v1/auth/login",
            http_method="POST",
            status_code=401,
            error_message="Invalid email or password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = dict(row)
    if not user.get("is_active"):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact your administrator.",
        )

    # Fetch business name
    cursor.execute("SELECT business_name FROM businesses WHERE id = ?", (user["client_id"],))
    biz_row = cursor.fetchone()
    biz_name = biz_row["business_name"] if biz_row else "Platform System"
    conn.close()

    access_token = create_access_token(user["id"], user["role"], user["client_id"])
    refresh_token = create_refresh_token(user["id"])

    # Audit success login
    create_audit_log(
        level="INFO",
        service="Authentication",
        business_id=user["client_id"],
        business_name=biz_name,
        user_id=user["id"],
        user_name=user["name"],
        role=user["role"],
        event="User Login",
        status_str="SUCCESS",
        details=f"User {user['name']} ({user['role']}) logged in successfully.",
        endpoint="/api/v1/auth/login",
        http_method="POST",
        status_code=200
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "client_id": user["client_id"],
            "is_active": bool(user["is_active"]),
            "created_at": user.get("created_at"),
        }
    }

@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "client_id": current_user["client_id"],
        "is_active": bool(current_user["is_active"]),
        "created_at": current_user.get("created_at"),
    }

@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(req: TokenRefreshRequest):
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        user_id = payload.get("sub")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        
        user = dict(row)
        new_access_token = create_access_token(user["id"], user["role"], user["client_id"])
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOKEN_EXPIRED",
        )

@router.post("/verify-admin-code", response_model=AdminCodeVerifyResponse)
def verify_admin_code(req: AdminCodeVerifyRequest, current_user: dict = Depends(get_current_user)):
    """
    Securely validates the administrator access code for unlocking Business Admin controls.
    Only users with BUSINESS_ADMIN, CLIENT_ADMIN, or SUPER_ADMIN can unlock controls.
    """
    user_role = current_user.get("role")
    if user_role not in ["BUSINESS_ADMIN", "CLIENT_ADMIN", "SUPER_ADMIN"]:
        create_audit_log(
            level="WARNING",
            service="Access Control",
            business_id=current_user.get("client_id"),
            business_name="Staff Organization",
            user_id=current_user.get("id"),
            user_name=current_user.get("name"),
            role=user_role,
            event="Unauthorized Admin Access Attempt",
            status_str="FAILED",
            details="Staff member attempted to unlock Admin Control Center.",
            endpoint="/api/v1/auth/verify-admin-code",
            http_method="POST",
            status_code=403
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff users cannot access Admin Control. Administrator privilege required."
        )

    is_valid = verify_admin_access_code(req.access_code)
    
    # Audit access attempt
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT business_name FROM businesses WHERE id = ?", (current_user["client_id"],))
    biz_row = cursor.fetchone()
    biz_name = biz_row["business_name"] if biz_row else "Platform System"
    conn.close()

    if not is_valid:
        create_audit_log(
            level="WARNING",
            service="Access Control",
            business_id=current_user.get("client_id"),
            business_name=biz_name,
            user_id=current_user.get("id"),
            user_name=current_user.get("name"),
            role=user_role,
            event="Admin Access Failed",
            status_str="FAILED",
            details=f"Incorrect admin access code entered by {current_user['name']}.",
            endpoint="/api/v1/auth/verify-admin-code",
            http_method="POST",
            status_code=400
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Administrator Access Code. Please check code and try again."
        )

    # Valid unlock
    unlocked_until = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=4)).isoformat()
    
    create_audit_log(
        level="INFO",
        service="Access Control",
        business_id=current_user.get("client_id"),
        business_name=biz_name,
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        role=user_role,
        event="Admin Access Unlocked",
        status_str="SUCCESS",
        details=f"Admin Control Center unlocked by {current_user['name']}.",
        endpoint="/api/v1/auth/verify-admin-code",
        http_method="POST",
        status_code=200
    )

    return {
        "success": True,
        "message": "Administrator Access Granted. Controls unlocked.",
        "unlocked_until": unlocked_until,
        "user_role": user_role
    }
