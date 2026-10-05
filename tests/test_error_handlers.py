"""Direct tests for the exception handlers that are hard to trigger through a normal request
(the generic 500 fallback, and the rate-limit handler's response shape)."""
import pytest

from app.core.exceptions import _rate_limited, _unhandled


@pytest.mark.anyio
async def test_unhandled_exception_returns_generic_500_body():
    response = await _unhandled(None, RuntimeError("something broke internally"))
    assert response.status_code == 500
    assert b"INTERNAL_ERROR" in response.body
    assert b"something broke internally" not in response.body  # never leak internals


@pytest.mark.anyio
async def test_rate_limited_returns_429_body():
    response = await _rate_limited(None, None)
    assert response.status_code == 429
    assert b"RATE_LIMITED" in response.body
