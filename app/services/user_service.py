"""User management inside ONE tenant. All lookups go through the tenant-scoped repository."""
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import TenantUserRepository, UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import record_audit
from app.services.protection_service import assert_user_not_protected
from app.services.transactions import commit_or_conflict
from app.utils.helpers import drop_nulls

_EMAIL_TAKEN = "A user with this email already exists"
_EMAIL_TAKEN_CODE = "EMAIL_ALREADY_REGISTERED"


class UserService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.repo = TenantUserRepository(db, tenant_id)

    def list(self, offset: int, limit: int, role: UserRole | None,
             is_active: bool | None) -> tuple[list[User], int]:
        filters = []
        if role is not None:
            filters.append(User.role == role)
        if is_active is not None:
            filters.append(User.is_active == is_active)
        return self.repo.list(offset=offset, limit=limit, filters=filters)

    def get(self, user_id: int) -> User:
        # Another tenant's user is reported as "not found" (never 403) to avoid leaking existence.
        user = self.repo.get(user_id)
        if user is None:
            raise NotFoundError("User not found", error_code="USER_NOT_FOUND")
        return user

    def create(self, data: UserCreate, actor: User, ip: str | None) -> User:
        if UserRepository(self.db).get_by_email(data.email):
            raise ConflictError(_EMAIL_TAKEN, error_code=_EMAIL_TAKEN_CODE)
        user = self.repo.add(User(
            name=data.name, email=data.email, role=data.role,
            password_hash=hash_password(data.password)))
        record_audit(self.db, "user.create", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="user", entity_id=user.id, details={"role": data.role.value},
                     ip_address=ip)
        commit_or_conflict(self.db, _EMAIL_TAKEN, _EMAIL_TAKEN_CODE)
        self.db.refresh(user)
        return user

    def update(self, user_id: int, data: UserUpdate, actor: User, ip: str | None) -> User:
        user = self.get(user_id)
        changes = drop_nulls(data.model_dump(exclude_unset=True))

        if user.is_protected:
            action = "update"
            if changes.get("is_active") is False:
                action = "deactivate"
            elif "role" in changes:
                action = "role"
            elif "email" in changes:
                action = "email"
            elif "is_protected" in changes:
                action = "is_protected"
            elif "is_verified" in changes:
                action = "is_verified"
            assert_user_not_protected(user, action, actor=actor, db=self.db, ip=ip, details={"fields": sorted(changes)})

        if user.id == actor.id and ("role" in changes or "is_active" in changes):
            raise ForbiddenError("You cannot change your own role or active status",
                                 error_code="CANNOT_MODIFY_SELF")
        for field, value in changes.items():
            if field == "is_verified":
                from datetime import datetime, timezone
                user.email_verified_at = datetime.now(timezone.utc) if value else None
            else:
                setattr(user, field, value)
        action = "user.deactivate" if changes.get("is_active") is False else "user.update"
        record_audit(self.db, action, user_id=actor.id, client_id=self.tenant_id,
                     entity_type="user", entity_id=user.id,
                     details={"fields": sorted(changes)}, ip_address=ip)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user_id: int, actor: User, ip: str | None) -> None:
        user = self.get(user_id)
        if user.is_protected:
            assert_user_not_protected(user, "delete", actor=actor, db=self.db, ip=ip)
        self.repo.delete(user)
        record_audit(self.db, "user.delete", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="user", entity_id=user.id, ip_address=ip)
        self.db.commit()

    def deactivate(self, user_id: int, actor: User, ip: str | None) -> User:
        user = self.get(user_id)
        if user.is_protected:
            assert_user_not_protected(user, "deactivate", actor=actor, db=self.db, ip=ip)
        user.is_active = False
        record_audit(self.db, "user.deactivate", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="user", entity_id=user.id, ip_address=ip)
        self.db.commit()
        self.db.refresh(user)
        return user

