"""Application-facing facade over the Sarvam integration.

The rest of the app calls THIS, never `app.integrations.sarvam.client` directly, so a second
provider is added by writing one more file like this one and switching Agent.provider.
"""
from __future__ import annotations

from typing import Any

from app.integrations.sarvam.client import SarvamAPIError, SarvamClient
from app.models.agent import Agent


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
