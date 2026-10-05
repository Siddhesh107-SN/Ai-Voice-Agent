from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.repositories.base import TenantRepository


class AgentRepository(TenantRepository[Agent]):
    """Agents of ONE client."""

    model = Agent


def get_by_provider_ref(db: Session, provider: str, provider_agent_id: str,
                        exclude_id: int | None = None) -> Agent | None:
    """`(provider, provider_agent_id)` is unique platform-wide (see Agent model), so this
    check is intentionally NOT tenant-scoped."""
    query = select(Agent).where(Agent.provider == provider,
                                Agent.provider_agent_id == provider_agent_id)
    if exclude_id is not None:
        query = query.where(Agent.id != exclude_id)
    return db.scalar(query)
