"""Enforces protection rules for users with is_protected = True."""
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError
from app.models.user import User
from app.services.audit_service import record_audit


class ProtectedUserError(ForbiddenError):
    status_code = 403
    error_code = "PROTECTED_USER_CANNOT_BE_MODIFIED"
    message = "Protected user accounts cannot be modified or deleted"

    def __init__(
        self,
        message: str = "Protected user accounts cannot be modified or deleted",
        *,
        error_code: str = "PROTECTED_USER_CANNOT_BE_MODIFIED",
    ) -> None:
        self.custom_body = {"detail": message, "code": error_code}
        super().__init__(message, error_code=error_code)


def assert_user_not_protected(
    user: User,
    action: str,
    actor: User | None = None,
    db: Session | None = None,
    ip: str | None = None,
    details: dict | None = None,
) -> None:
    """Enforce that protected users cannot be deleted, deactivated, demoted,
    have email/role/status changed, or have passwords reset by anyone else.
    
    Rejects with 403 ForbiddenError and creates an audit log entry for the attempt.
    """
    if not getattr(user, "is_protected", False):
        return

    action_messages = {
        "delete": "Protected user accounts cannot be deleted",
        "deactivate": "Protected user accounts cannot be deactivated",
        "role": "Protected user accounts cannot change role or be demoted",
        "role_change": "Protected user accounts cannot change role or be demoted",
        "email": "Protected user accounts cannot change email",
        "email_change": "Protected user accounts cannot change email",
        "is_protected": "Protected user status cannot be changed",
        "is_active": "Protected user active status cannot be changed",
        "is_verified": "Protected user verification status cannot be changed",
        "status_change": "Protected user status cannot be changed",
        "reset_password": "Protected user password cannot be reset by another user",
        "password_reset": "Protected user password cannot be reset by another user",
        "forgot_password": "Password reset is not permitted for protected accounts",
    }
    message = action_messages.get(action, "Protected user accounts cannot be modified or deleted")

    if db is not None:
        audit_details = {
            "blocked_action": action,
            "target_user_id": user.id,
            "target_email": user.email,
            "actor_id": actor.id if actor else None,
            "actor_email": actor.email if actor else None,
        }
        if details:
            audit_details.update(details)

        record_audit(
            db,
            action="user.modification_blocked",
            user_id=actor.id if actor else user.id,
            client_id=actor.client_id if actor else user.client_id,
            entity_type="user",
            entity_id=user.id,
            details=audit_details,
            level="warn",
            message=f"Blocked attempt to perform {action} on protected user {user.email}",
            ip_address=ip,
        )
        db.commit()

    raise ProtectedUserError(message=message)
