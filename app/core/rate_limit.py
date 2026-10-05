"""Shared rate limiter (per client IP). Behind a proxy, configure forwarded-IP handling."""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

limiter = Limiter(key_func=get_remote_address, enabled=get_settings().rate_limit_enabled)

REGISTER_LIMIT = "5/minute"
LOGIN_LIMIT = "10/minute"
REFRESH_LIMIT = "30/minute"
