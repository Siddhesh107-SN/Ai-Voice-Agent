from sqlalchemy.orm import Session

from app.models.call_attempt import CallAttempt


class CallAttemptRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, attempt: CallAttempt) -> CallAttempt:
        self.db.add(attempt)
        self.db.flush()
        return attempt
