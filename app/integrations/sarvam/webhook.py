"""Sarvam webhook signature verification.

Sarvam's exact signing scheme isn't public in this environment, so this implements the
standard, safe pattern (HMAC-SHA256 over the raw body, hex-encoded, constant-time compare)
behind SARVAM_WEBHOOK_SECRET. Swap the digest computation here if Sarvam's real docs specify
something different (e.g. a timestamp-prefixed payload) — nothing else needs to change.
"""
import hmac
from hashlib import sha256


def compute_signature(raw_body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw_body, sha256).hexdigest()


def verify_signature(raw_body: bytes, signature: str | None, secret: str) -> bool:
    """Constant-time comparison. A blank secret always fails closed (never verifies)."""
    if not secret or not signature:
        return False
    expected = compute_signature(raw_body, secret)
    try:
        return hmac.compare_digest(expected, signature)
    except (TypeError, ValueError):
        return False
