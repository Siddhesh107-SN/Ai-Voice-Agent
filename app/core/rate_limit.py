"""Shared rate limiter (per client IP). Behind a proxy, configure forwarded-IP handling."""
from ipaddress import ip_address

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings


def get_rate_limit_key(request: Request) -> str:
    trusted_proxy_count = get_settings().trusted_proxy_count
    if trusted_proxy_count <= 0:
        return get_remote_address(request)

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        forwarded_ips = [address.strip() for address in forwarded_for.split(",")]
        client_index = len(forwarded_ips) - trusted_proxy_count
        if client_index >= 0:
            try:
                return str(ip_address(forwarded_ips[client_index]))
            except ValueError:
                pass

    return get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key, enabled=get_settings().rate_limit_enabled)

REGISTER_LIMIT = "5/minute"
LOGIN_LIMIT = "10/minute"
REFRESH_LIMIT = "30/minute"
