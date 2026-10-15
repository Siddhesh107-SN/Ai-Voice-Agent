"""Application-facing facade over the Sarvam integration.

The rest of the app calls THIS, never `app.integrations.sarvam.client` directly, so a second
provider is added by writing one more file like this one and switching Agent.provider.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.sarvam.client import SarvamAPIError, SarvamClient
from app.integrations.sarvam.schemas import SarvamOutboundPayload
from app.models.agent import Agent
from app.models.call_attempt import CallAttempt
from app.models.client import Client
from app.repositories.call_attempt_repository import CallAttemptRepository

logger = logging.getLogger(__name__)


class SarvamService:
    def __init__(self, client: SarvamClient | None = None) -> None:
        self.client = client or SarvamClient()

    def register_agent(self, agent: Agent) -> str | None:
        """Create the agent on Sarvam's side; returns the provider's id, or None on failure
        (never raises — provisioning the provider side is best-effort and can be retried)."""
        try:
            result = self.client.create_provider_agent(
                name=agent.name, configuration=agent.configuration)
        except SarvamAPIError:
            return None
        return result.get("id")

    def sync_configuration(self, agent: Agent) -> bool:
        if not agent.provider_agent_id:
            return False
        try:
            self.client.update_provider_agent(agent.provider_agent_id,
                                              configuration=agent.configuration)
        except SarvamAPIError:
            return False
        return True

    def trigger_outbound_call(self, agent: Agent, phone_number: str) -> dict[str, Any] | None:
        if not agent.provider_agent_id:
            return None
        try:
            return self.client.initiate_outbound_call(agent.provider_agent_id,
                                                       phone_number=phone_number)
        except SarvamAPIError:
            return None


def process_sarvam_outbound(db: Session, payload: SarvamOutboundPayload) -> None:
    metadata = payload.webhook_config.metadata if payload.webhook_config else None
    client_id = None
    if metadata:
        raw_client_id = metadata.get("client_id", metadata.get("tenant_id"))
        try:
            candidate = int(raw_client_id) if raw_client_id is not None else None
        except (TypeError, ValueError):
            candidate = None
        if candidate is not None and db.get(Client, candidate) is not None:
            client_id = candidate
        elif raw_client_id is not None:
            logger.warning("Sarvam outbound webhook metadata has no valid client_id")
    else:
        logger.warning("Sarvam outbound webhook has no webhook_config.metadata")

    attempt = CallAttempt(
        attempt_id=payload.attempt_id,
        client_id=client_id,
        status=payload.status,
        duration=float(payload.duration) if payload.duration is not None else None,
        interaction_id=payload.interaction_id if payload.status == "connected" else None,
        failure_reason=payload.failure_reason if payload.status != "connected" else None,
        final_agent_variables=(
            payload.final_agent_variables if payload.status == "connected" else None
        ),
        interaction_transcript=(
            [item.model_dump() for item in payload.interaction_transcript]
            if payload.status == "connected" and payload.interaction_transcript is not None
            else None
        ),
    )
    try:
        CallAttemptRepository(db).add(attempt)
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.scalar(select(CallAttempt).where(CallAttempt.attempt_id == payload.attempt_id)):
            logger.info("Duplicate Sarvam outbound attempt ignored: %s", payload.attempt_id)
            return
        raise
