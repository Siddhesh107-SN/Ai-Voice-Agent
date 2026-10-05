"""Thin HTTP client for Sarvam's REST API (outbound direction: us -> Sarvam).

Kept deliberately generic (one `request` method) since Sarvam's exact endpoint paths aren't
available in this environment. Call sites (SarvamService) name the paths; nothing elsewhere
in the app imports httpx directly, so swapping providers later means writing a new class with
the same shape as this one, not touching services/routes.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class SarvamAPIError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Sarvam API error {status_code}: {detail}")


class SarvamClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None,
                timeout: float = 10.0) -> None:
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.sarvam_api_key
        self.base_url = (base_url if base_url is not None else settings.sarvam_base_url).rstrip("/")
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def request(self, method: str, path: str, *, json: dict[str, Any] | None = None) -> dict:
        if not self.base_url:
            raise SarvamAPIError(0, "SARVAM_BASE_URL is not configured")
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            resp = httpx.request(method, url, json=json, headers=self._headers(),
                                 timeout=self.timeout)
        except httpx.HTTPError as exc:
            raise SarvamAPIError(0, str(exc)) from exc
        if resp.status_code >= 400:
            raise SarvamAPIError(resp.status_code, resp.text[:500])
        return resp.json() if resp.content else {}

    # ----- example calls; adjust paths once Sarvam's real API reference is available -----
    def create_provider_agent(self, *, name: str, configuration: dict[str, Any]) -> dict:
        return self.request("POST", "/agents", json={"name": name, "config": configuration})

    def update_provider_agent(self, provider_agent_id: str, *, configuration: dict[str, Any]) -> dict:
        return self.request("PATCH", f"/agents/{provider_agent_id}", json={"config": configuration})

    def initiate_outbound_call(self, provider_agent_id: str, *, phone_number: str) -> dict:
        return self.request("POST", f"/agents/{provider_agent_id}/calls",
                            json={"phone_number": phone_number})
