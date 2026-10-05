"""Agent management within ONE tenant."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.agent import Agent
from app.models.enums import AgentStatus
from app.models.user import User
from app.repositories.agent_repository import AgentRepository, get_by_provider_ref
from app.schemas.agent import AgentCreate, AgentUpdate
from app.services.audit_service import record_audit
from app.services.transactions import commit_or_conflict
from app.utils.helpers import drop_nulls

_REF_TAKEN = "This provider agent id is already registered to another agent"
_REF_CODE = "AGENT_PROVIDER_REF_EXISTS"


class AgentService:
    def __init__(self, db: Session, tenant_id: int) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.repo = AgentRepository(db, tenant_id)

    def list(self, offset: int, limit: int, *, status: AgentStatus | None,
             provider: str | None) -> tuple[list[Agent], int]:
        filters = []
        if status is not None:
            filters.append(Agent.status == status)
        if provider is not None:
            filters.append(Agent.provider == provider)
        return self.repo.list(offset=offset, limit=limit, filters=filters,
                              order_by=[Agent.name, Agent.id])

    def get(self, agent_id: int) -> Agent:
        agent = self.repo.get(agent_id)
        if agent is None:
            raise NotFoundError("Agent not found", error_code="AGENT_NOT_FOUND")
        return agent

    def create(self, data: AgentCreate, actor: User, ip: str | None) -> Agent:
        if data.provider_agent_id and get_by_provider_ref(self.db, data.provider,
                                                           data.provider_agent_id):
            raise ConflictError(_REF_TAKEN, error_code=_REF_CODE)
        agent = self.repo.add(Agent(**data.model_dump()))
        record_audit(self.db, "agent.create", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="agent", entity_id=agent.id,
                     details={"provider": data.provider}, ip_address=ip)
        commit_or_conflict(self.db, _REF_TAKEN, _REF_CODE)
        self.db.refresh(agent)
        return agent

    def update(self, agent_id: int, data: AgentUpdate, actor: User, ip: str | None) -> Agent:
        agent = self.get(agent_id)
        changes = drop_nulls(data.model_dump(exclude_unset=True),
                             nullable=("description", "phone_number", "provider_agent_id"))
        provider = changes.get("provider", agent.provider)
        ref = changes.get("provider_agent_id", agent.provider_agent_id)
        if ref and (provider, ref) != (agent.provider, agent.provider_agent_id) \
                and get_by_provider_ref(self.db, provider, ref, exclude_id=agent.id):
            raise ConflictError(_REF_TAKEN, error_code=_REF_CODE)
        for field, value in changes.items():
            setattr(agent, field, value)
        # Configuration may hold prompt text or contact details; keep the audit log to field names.
        record_audit(self.db, "agent.update", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="agent", entity_id=agent.id,
                     details={"fields": sorted(changes)}, ip_address=ip)
        commit_or_conflict(self.db, _REF_TAKEN, _REF_CODE)
        self.db.refresh(agent)
        return agent

    def delete(self, agent_id: int, actor: User, ip: str | None) -> None:
        agent = self.get(agent_id)
        record_audit(self.db, "agent.delete", user_id=actor.id, client_id=self.tenant_id,
                     entity_type="agent", entity_id=agent_id,
                     details={"provider": agent.provider}, ip_address=ip)
        self.repo.delete(agent)
        self.db.commit()
