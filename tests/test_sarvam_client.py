"""Unit tests for the outbound Sarvam integration layer (client + service facade)."""
import httpx
import pytest

from app.integrations.sarvam.client import SarvamAPIError, SarvamClient
from app.services.sarvam_service import SarvamService


class _Agent:
    provider_agent_id = None
    name = "Zoya"
    configuration = {"voice": "female"}


def test_request_without_base_url_raises():
    client = SarvamClient(api_key="k", base_url="")
    with pytest.raises(SarvamAPIError, match="not configured"):
        client.request("GET", "/agents")


def test_request_success(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        assert method == "POST" and url == "https://sarvam.example/agents"
        assert headers["Authorization"] == "Bearer test-key"
        return httpx.Response(200, json={"id": "agent-123"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    client = SarvamClient(api_key="test-key", base_url="https://sarvam.example")
    result = client.create_provider_agent(name="Zoya", configuration={"voice": "female"})
    assert result == {"id": "agent-123"}


def test_request_error_status_raises_with_body(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(400, text="bad request", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    client = SarvamClient(api_key="k", base_url="https://sarvam.example")
    with pytest.raises(SarvamAPIError) as err:
        client.request("GET", "/agents")
    assert err.value.status_code == 400 and "bad request" in err.value.detail


def test_request_network_error_wrapped(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr(httpx, "request", fake_request)
    client = SarvamClient(api_key="k", base_url="https://sarvam.example")
    with pytest.raises(SarvamAPIError):
        client.request("GET", "/agents")


def test_service_register_agent_returns_provider_id(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(200, json={"id": "agent-999"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.register_agent(_Agent()) == "agent-999"


def test_service_register_agent_returns_none_on_api_error(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(500, text="boom", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.register_agent(_Agent()) is None


def test_service_sync_configuration_requires_provider_agent_id():
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.sync_configuration(_Agent()) is False


def test_service_sync_configuration_success(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(200, json={}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    agent = _Agent()
    agent.provider_agent_id = "agent-999"
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.sync_configuration(agent) is True


def test_service_trigger_outbound_call_without_provider_id_returns_none():
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.trigger_outbound_call(_Agent(), "+919876543210") is None


def test_service_trigger_outbound_call_success(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        assert "+919876543210" in str(json)
        return httpx.Response(200, json={"call_id": "abc"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    agent = _Agent()
    agent.provider_agent_id = "agent-999"
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.trigger_outbound_call(agent, "+919876543210") == {"call_id": "abc"}


def test_service_sync_configuration_failure(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(500, text="boom", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    agent = _Agent()
    agent.provider_agent_id = "agent-999"
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.sync_configuration(agent) is False


def test_service_trigger_outbound_call_failure(monkeypatch):
    def fake_request(method, url, json=None, headers=None, timeout=None):
        return httpx.Response(500, text="boom", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "request", fake_request)
    agent = _Agent()
    agent.provider_agent_id = "agent-999"
    service = SarvamService(SarvamClient(api_key="k", base_url="https://sarvam.example"))
    assert service.trigger_outbound_call(agent, "+919876543210") is None
