from sqlalchemy import select

from app.models.customer import Customer
from app.repositories.base import TenantRepository


class CustomerRepository(TenantRepository[Customer]):
    model = Customer

    def get_by_phone(self, phone: str) -> Customer | None:
        return self.db.scalar(self._select().where(Customer.phone == phone))

    def search_filter(self, term: str):
        like = f"%{term}%"
        return Customer.name.ilike(like) | Customer.phone.ilike(like)
