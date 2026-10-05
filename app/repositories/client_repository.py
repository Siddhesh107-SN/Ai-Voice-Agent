from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.enums import ClientStatus


class ClientRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, client_id: int) -> Client | None:
        return self.db.get(Client, client_id)

    def get_by_email(self, email: str) -> Client | None:
        return self.db.scalar(select(Client).where(Client.email == email.lower()))

    def add(self, client: Client) -> Client:
        self.db.add(client)
        self.db.flush()
        return client

    def list(self, *, offset: int, limit: int, status: ClientStatus | None = None,
             search: str | None = None) -> tuple[list[Client], int]:
        query = select(Client)
        if status is not None:
            query = query.where(Client.status == status)
        if search:
            query = query.where(Client.business_name.ilike(f"%{search}%"))
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = self.db.scalars(query.order_by(Client.id).offset(offset).limit(limit)).all()
        return list(items), total
