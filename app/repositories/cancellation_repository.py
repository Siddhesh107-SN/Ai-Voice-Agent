from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.cancellation import Cancellation
from app.repositories.base import TenantRepository


class CancellationRepository(TenantRepository[Cancellation]):
    model = Cancellation

    def _select(self):
        return super()._select().options(selectinload(Cancellation.customer))

