from types import SimpleNamespace

from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core import rate_limit


def _request(peer_ip: str, forwarded_for: str | None = None) -> Request:
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode("ascii")))
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": headers,
            "client": (peer_ip, 12345),
            "server": ("testserver", 80),
        }
    )


def test_default_rate_limit_key_uses_direct_peer(monkeypatch):
    monkeypatch.setattr(
        rate_limit,
        "get_settings",
        lambda: SimpleNamespace(trusted_proxy_count=0),
    )
    request = _request("192.0.2.10", "198.51.100.77")

    assert rate_limit.get_rate_limit_key(request) == get_remote_address(request)


def test_trusted_proxy_count_ignores_forged_leftmost_forwarded_ip(monkeypatch):
    monkeypatch.setattr(
        rate_limit,
        "get_settings",
        lambda: SimpleNamespace(trusted_proxy_count=1),
    )
    request = _request("127.0.0.1", "203.0.113.99, 198.51.100.24")

    assert rate_limit.get_rate_limit_key(request) == "198.51.100.24"


def test_different_forwarded_client_ips_use_separate_rate_limit_buckets(monkeypatch):
    monkeypatch.setattr(
        rate_limit,
        "get_settings",
        lambda: SimpleNamespace(trusted_proxy_count=1),
    )
    first = _request("127.0.0.1", "198.51.100.24")
    second = _request("127.0.0.1", "198.51.100.25")

    assert rate_limit.get_rate_limit_key(first) != rate_limit.get_rate_limit_key(second)
