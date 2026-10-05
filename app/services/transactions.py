from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError


def commit_or_conflict(db: Session, message: str, error_code: str) -> None:
    """Commit; a unique-constraint race becomes a clean 409 instead of a 500."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(message, error_code=error_code) from exc
