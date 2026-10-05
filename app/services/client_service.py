"""Client (tenant) management and provisioning."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.client import Client
from app.models.enums import ClientStatus, UserRole
from app.models.user import User
from app.repositories.client_repository import ClientRepository
from app.repositories.user_repository import UserRepository
from app.schemas.client import ClientCreate, ClientProfileUpdate, ClientUpdate
from app.services.audit_service import record_audit
from app.services.transactions import commit_or_conflict
from app.utils.helpers import drop_nulls

_EMAIL_TAKEN = "Email is already registered"
_EMAIL_TAKEN_CODE = "EMAIL_ALREADY_REGISTERED"


def provision_client(db: Session, *, business_name: str, email: str, phone: str | None,
                     address: str | None, admin_name: str, admin_email: str,
                     admin_password: str, timezone: str | None = None) -> tuple[Client, User]:
    """Create a client and its first CLIENT_ADMIN (flushes; caller commits)."""
    clients, users = ClientRepository(db), UserRepository(db)
    if clients.get_by_email(email) or users.get_by_email(admin_email):
        raise ConflictError(_EMAIL_TAKEN, error_code=_EMAIL_TAKEN_CODE)
    client = clients.add(Client(
        business_name=business_name, email=email, phone=phone, address=address,
        timezone=timezone or get_settings().default_timezone))
    admin = users.add(User(
        client_id=client.id, name=admin_name, email=admin_email,
        password_hash=hash_password(admin_password), role=UserRole.CLIENT_ADMIN))
    return client, admin


class ClientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.clients = ClientRepository(db)

    # ----- platform level (SUPER_ADMIN) -----
    def create(self, data: ClientCreate, actor: User, ip: str | None) -> Client:
        client, admin = provision_client(
            self.db, business_name=data.business_name, email=data.email, phone=data.phone,
            address=data.address, timezone=data.timezone, admin_name=data.admin.name, admin_email=data.admin.email,
            admin_password=data.admin.password)
        record_audit(self.db, "client.create", user_id=actor.id, client_id=client.id,
                     entity_type="client", entity_id=client.id,
                     details={"admin_user_id": admin.id}, ip_address=ip)
        commit_or_conflict(self.db, _EMAIL_TAKEN, _EMAIL_TAKEN_CODE)
        self.db.refresh(client)
        return client

    def list(self, offset: int, limit: int, status: ClientStatus | None,
             search: str | None) -> tuple[list[Client], int]:
        return self.clients.list(offset=offset, limit=limit, status=status, search=search)

    def get(self, client_id: int) -> Client:
        client = self.clients.get_by_id(client_id)
        if client is None:
            raise NotFoundError("Client not found", error_code="CLIENT_NOT_FOUND")
        return client

    def update(self, client_id: int, data: ClientUpdate, actor: User, ip: str | None) -> Client:
        client = self.get(client_id)
        changes = drop_nulls(data.model_dump(exclude_unset=True), nullable=("phone", "address"))
        if "email" in changes and changes["email"] != client.email \
                and self.clients.get_by_email(changes["email"]):
            raise ConflictError(_EMAIL_TAKEN, error_code=_EMAIL_TAKEN_CODE)
        for field, value in changes.items():
            setattr(client, field, value)
        record_audit(self.db, "client.update", user_id=actor.id, client_id=client.id,
                     entity_type="client", entity_id=client.id,
                     details={"fields": sorted(changes)}, ip_address=ip)
        commit_or_conflict(self.db, _EMAIL_TAKEN, _EMAIL_TAKEN_CODE)
        self.db.refresh(client)
        return client

    def set_status(self, client_id: int, status: ClientStatus, actor: User,
                   ip: str | None) -> Client:
        client = self.get(client_id)
        client.status = status
        action = "client.enable" if status == ClientStatus.ACTIVE else "client.disable"
        record_audit(self.db, action, user_id=actor.id, client_id=client.id,
                     entity_type="client", entity_id=client.id, ip_address=ip)
        self.db.commit()
        self.db.refresh(client)
        return client

    # ----- own business profile (CLIENT_ADMIN / CLIENT_STAFF) -----
    def update_own(self, client_id: int, data: ClientProfileUpdate, actor: User,
                   ip: str | None) -> Client:
        client = self.get(client_id)
        changes = drop_nulls(data.model_dump(exclude_unset=True), nullable=("phone", "address"))
        for field, value in changes.items():
            setattr(client, field, value)
        record_audit(self.db, "client.update_profile", user_id=actor.id, client_id=client.id,
                     entity_type="client", entity_id=client.id,
                     details={"fields": sorted(changes)}, ip_address=ip)
        self.db.commit()
        self.db.refresh(client)
        return client
