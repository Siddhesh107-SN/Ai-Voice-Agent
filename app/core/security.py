"""Password hashing (Argon2id) and JWT creation/verification."""
import enum
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import get_settings
from app.core.exceptions import InvalidTokenError, TokenExpiredError
from app.models.enums import UserRole

_hasher = PasswordHasher()
# Verified against when the email is unknown, so timing doesn't reveal which emails exist.
DUMMY_HASH = _hasher.hash("timing-equalizer-not-a-real-password")


class TokenType(str, enum.Enum):
    ACCESS = "access"
    REFRESH = "refresh"


@dataclass(frozen=True)
class TokenPayload:
    user_id: int
    client_id: int | None
    role: UserRole
    token_type: TokenType
    jti: str | None = None


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def _create_token(user_id: int, client_id: int | None, role: UserRole,
                  token_type: TokenType, expires_delta: timedelta,
                  jti: str | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "client_id": client_id,
        "role": role.value,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": jti or uuid.uuid4().hex,
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, client_id: int | None, role: UserRole,
                        expires_delta: timedelta | None = None) -> str:
    delta = expires_delta or timedelta(minutes=get_settings().access_token_expire_minutes)
    return _create_token(user_id, client_id, role, TokenType.ACCESS, delta)


def create_refresh_token(user_id: int, client_id: int | None, role: UserRole,
                         expires_delta: timedelta | None = None,
                         jti: str | None = None) -> str:
    delta = expires_delta or timedelta(days=get_settings().refresh_token_expire_days)
    return _create_token(user_id, client_id, role, TokenType.REFRESH, delta, jti=jti)


def create_elevation_token(user_id: int, client_id: int,
                           expires_delta: timedelta | None = None) -> str:
    """Issue a 15-minute elevation token for client_staff PIN elevation."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    delta = expires_delta or timedelta(seconds=900)
    claims = {
        "sub": str(user_id),
        "client_id": client_id,
        "elev": True,
        "iat": now,
        "exp": now + delta,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: TokenType) -> TokenPayload:
    """Verify signature, expiry and token type. Raises 401 errors on any problem."""
    settings = get_settings()
    try:
        # Algorithms are pinned, so "alg: none" and algorithm-swap tokens are rejected.
        claims = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise TokenExpiredError() from exc
    except JWTError as exc:
        raise InvalidTokenError() from exc

    if claims.get("type") != expected_type.value:
        raise InvalidTokenError()
    try:
        return TokenPayload(
            user_id=int(claims["sub"]),
            client_id=claims.get("client_id"),
            role=UserRole(claims["role"]),
            token_type=expected_type,
            jti=claims.get("jti"),
        )
    except (KeyError, ValueError, TypeError) as exc:
        raise InvalidTokenError() from exc
