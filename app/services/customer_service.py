from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.customer import Customer
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.audit_service import record_audit
from app.services.transactions import commit_or_conflict
from app.utils.helpers import drop_nulls

_PHONE_TAKEN = "A customer with this phone number already exists"
_PHONE_CODE = "CUSTOMER_PHONE_EXISTS"


class CustomerService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.repo = CustomerRepository(db, tenant_id)

    def list(self, offset: int, limit: int, search: str | None) -> tuple[list[Customer], int]:
        filters = [self.repo.search_filter(search)] if search else []
        return self.repo.list(offset=offset, limit=limit, filters=filters,
                              order_by=[Customer.name, Customer.id])

    def get(self, customer_id: int) -> Customer:
        customer = self.repo.get(customer_id)
        if customer is None:
            raise NotFoundError("Customer not found", error_code="CUSTOMER_NOT_FOUND")
        return customer

    def get_or_create_by_phone(self, phone: str, name: str | None,
                              source: str = "user.create") -> Customer:
        """Used by the AI-agent booking path: a caller may be new. `name` falls back to a
        placeholder so an unnamed caller can still be booked; staff can rename them later."""
        existing = self.repo.get_by_phone(phone)
        if existing is not None:
            return existing
        customer = self.repo.add(Customer(name=(name or "Unknown Caller").strip() or "Unknown Caller",
                                          phone=phone))
        record_audit(self.db, source, client_id=self.tenant_id, entity_type="customer",
                     entity_id=customer.id)
        commit_or_conflict(self.db, _PHONE_TAKEN, _PHONE_CODE)
        self.db.refresh(customer)
        return customer

    def create(self, data: CustomerCreate, actor: User, ip: str | None) -> Customer:
        if self.repo.get_by_phone(data.phone):
            raise ConflictError(_PHONE_TAKEN, error_code=_PHONE_CODE)
        customer = self.repo.add(Customer(**data.model_dump()))
        # Audit details hold ids/field names only, never personal data.
        record_audit(self.db, "customer.create", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="customer", entity_id=customer.id, ip_address=ip)
        commit_or_conflict(self.db, _PHONE_TAKEN, _PHONE_CODE)
        self.db.refresh(customer)
        return customer

    def update(self, customer_id: int, data: CustomerUpdate, actor: User,
               ip: str | None) -> Customer:
        customer = self.get(customer_id)
        changes = drop_nulls(data.model_dump(exclude_unset=True), nullable=("email",))
        phone = changes.get("phone")
        if phone and phone != customer.phone and self.repo.get_by_phone(phone):
            raise ConflictError(_PHONE_TAKEN, error_code=_PHONE_CODE)
        for field, value in changes.items():
            setattr(customer, field, value)
        record_audit(self.db, "customer.update", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="customer", entity_id=customer.id,
                     details={"fields": sorted(changes)}, ip_address=ip)
        commit_or_conflict(self.db, _PHONE_TAKEN, _PHONE_CODE)
        self.db.refresh(customer)
        return customer

    def delete(self, customer_id: int, actor: User, ip: str | None) -> None:
        customer = self.get(customer_id)
        try:
            self.repo.delete(customer)
        except IntegrityError as exc:  # appointments/calls/enquiries still reference it
            self.db.rollback()
            raise ConflictError("Customer has appointments, calls or enquiries and cannot be deleted",
                                error_code="CUSTOMER_HAS_RECORDS") from exc
        record_audit(self.db, "customer.delete", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="customer", entity_id=customer_id, ip_address=ip)
        self.db.commit()
