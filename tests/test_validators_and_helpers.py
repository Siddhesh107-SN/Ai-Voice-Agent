"""Direct unit tests for small pure-function utilities not otherwise exercised at the edges."""
from datetime import date, time

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import TokenType, create_access_token
from app.integrations.sarvam.webhook import verify_signature
from app.models.enums import UserRole
from app.repositories.customer_repository import CustomerRepository
from app.services.transactions import commit_or_conflict
from app.utils.helpers import day_bounds_utc, now_in_timezone
from app.utils.validators import validate_password_strength, validate_timezone


def test_password_too_long_rejected():
    with pytest.raises(ValueError, match="at most 128"):
        validate_password_strength("a1" * 65)


def test_password_without_digit_rejected():
    with pytest.raises(ValueError, match="letter and one digit"):
        validate_password_strength("onlyletters")


def test_password_without_letter_rejected():
    with pytest.raises(ValueError, match="letter and one digit"):
        validate_password_strength("12345678")


def test_validate_timezone_rejects_unknown_zone():
    with pytest.raises(ValueError, match="IANA name"):
        validate_timezone("Nowhere/Land")


def test_now_in_timezone_falls_back_to_utc_for_unknown_zone():
    # Should not raise; both real and unknown zones return a naive datetime.
    real = now_in_timezone("Asia/Kolkata")
    fallback = now_in_timezone("Nowhere/Land")
    assert real.tzinfo is None and fallback.tzinfo is None


def test_day_bounds_utc_falls_back_to_utc_for_unknown_zone():
    start, end = day_bounds_utc(date(2030, 1, 1), "Nowhere/Land")
    assert (end - start).total_seconds() == 86400


def test_settings_rejects_weak_secret_in_production():
    with pytest.raises(ValidationError):
        Settings(app_env="production", jwt_secret_key="too-short", database_url="sqlite://",
                 sarvam_api_key="", sarvam_base_url="", sarvam_webhook_secret="")


def test_settings_allows_weak_secret_outside_production():
    s = Settings(app_env="development", jwt_secret_key="short")
    assert s.jwt_secret_key == "short"


def test_decode_token_rejects_unknown_role_claim():
    from jose import jwt

    from app.core.config import get_settings
    from app.core.security import decode_token

    settings = get_settings()
    token = jwt.encode({"sub": "1", "client_id": 1, "role": "not_a_real_role", "type": "access",
                        "exp": 9999999999}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    with pytest.raises(Exception) as err:
        decode_token(token, TokenType.ACCESS)
    assert err.value.error_code == "INVALID_TOKEN"


def test_verify_signature_returns_false_for_non_string_signature():
    # A non-str/bytes signature must not raise — it must be treated as invalid.
    assert verify_signature(b"body", 12345, "secret") is False  # type: ignore[arg-type]


def test_verify_signature_accepts_correct_hmac():
    from app.integrations.sarvam.webhook import compute_signature

    sig = compute_signature(b"hello", "secret")
    assert verify_signature(b"hello", sig, "secret") is True


def test_tenant_repository_requires_a_client_id(db):
    with pytest.raises(ValueError, match="requires a client_id"):
        CustomerRepository(db, None)


def test_commit_or_conflict_turns_integrity_error_into_conflict(db):
    from app.core.exceptions import ConflictError
    from app.models.customer import Customer

    a = register_customer(db)
    db.add(Customer(client_id=a.client_id, name="Dup", phone=a.phone))
    with pytest.raises(ConflictError):
        commit_or_conflict(db, "duplicate", "DUP_CODE")


def register_customer(db):
    from app.models.client import Client
    from app.models.customer import Customer

    c = Client(business_name="Unit Test Co", email="unit@test.com")
    db.add(c)
    db.flush()
    cust = Customer(client_id=c.id, name="Original", phone="+919876500000")
    db.add(cust)
    db.commit()
    return cust
