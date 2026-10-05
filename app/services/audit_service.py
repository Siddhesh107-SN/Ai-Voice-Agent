"""Writes audit-log rows. Callers commit. Never pass secrets in `details`."""
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit(db: Session, action: str, *, user_id: int | None = None,
                 client_id: int | None = None, entity_type: str | None = None,
                 entity_id: int | str | None = None, details: dict | None = None,
                 ip_address: str | None = None) -> None:
    db.add(AuditLog(
        action=action, user_id=user_id, client_id=client_id, entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details, ip_address=ip_address,
    ))
