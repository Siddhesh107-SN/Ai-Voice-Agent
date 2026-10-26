# Talkaor Codebase Report

**Scope:** `C:\project\HarshBye\Ai-Voice-Agent`

This repository contains two FastAPI applications:

1. The root application under [`app/`](./app), using PostgreSQL, SQLAlchemy, and Alembic.
2. A separate nested application under [`ai-calling-frontend/backend/`](./ai-calling-frontend/backend), using SQLite and raw SQL.

The root application is the more complete backend and is documented first below. The nested application is documented separately where it differs.

---

## 1. Stack

### Primary root backend

| Item | Finding |
|---|---|
| Language | Python |
| Framework | FastAPI `0.115.0` |
| ORM | SQLAlchemy `2.0.35` |
| Runtime | Docker image uses Python `3.12`; local Python runtime version is **NOT PRESENT** as a repository requirement |
| ASGI server | Uvicorn `0.30.6` for development; Gunicorn `22.0.0` with Uvicorn workers for production |
| Package manager | `pip`, using [`requirements.txt`](./requirements.txt) |
| Frontend framework | Next.js `14.2.15`, React `18.3.1` |
| Frontend package manager | npm, indicated by [`package-lock.json`](./ai-calling-frontend/package-lock.json) |
| Validation | Pydantic `2.9.2`, Pydantic Settings `2.5.2` |
| Database driver | `psycopg2-binary` `2.9.10` |
| Authentication libraries | `python-jose[cryptography]` `3.3.0`, `argon2-cffi` `23.1.0` |
| Migration tool | Alembic `1.13.3` |
| Test framework | pytest `8.3.3` |

### Nested frontend backend

The repository also contains a separate FastAPI application under [`ai-calling-frontend/backend/app/main.py`](./ai-calling-frontend/backend/app/main.py).

| Item | Finding |
|---|---|
| Framework | FastAPI |
| Runtime | Python; exact version **NOT PRESENT** |
| Database | SQLite |
| Database access | Python `sqlite3`; no ORM |
| JWT library | `PyJWT` import is used |
| Password hashing | Custom salted SHA-256 implementation |
| Migrations | **NOT PRESENT** |
| Package manifest | **NOT PRESENT** inside the nested backend |
| Server entry point | [`ai-calling-frontend/backend/run.py`](./ai-calling-frontend/backend/run.py) |

### Local backend run

From the repository root:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The application loads `.env` from the repository root through [`app/core/config.py`](./app/core/config.py).

Docker development is defined in [`docker-compose.yml`](./docker-compose.yml):

```powershell
docker compose up --build
```

The compose command runs:

```text
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Local frontend run

```powershell
cd ai-calling-frontend
npm install
npm run dev
```

The frontend is normally available at `http://localhost:3000`.

The frontend package also defines:

```json
"backend": "python ../ai-calling-backend/run.py"
```

There is no root-level `ai-calling-backend` directory in the repository. The actual nested backend is at `ai-calling-frontend/backend`, so this npm script points to a path that is **NOT PRESENT**.

### Folder structure, two levels

Generated directories such as `node_modules`, `.next`, `venv`, `__pycache__`, and `.pytest_cache` are omitted from this source tree.

```text
Ai-Voice-Agent/
├── .dockerignore
├── .env
├── .gitignore
├── Dockerfile
├── alembic.ini
├── docker-compose.yml
├── docker-compose.prod.yml
├── gunicorn.conf.py
├── requirements.txt
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   ├── core/
│   ├── integrations/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── scripts/
│   └── services/
├── tests/
│   ├── conftest.py
│   ├── helpers.py
│   └── test_*.py
└── ai-calling-frontend/
    ├── .env.example
    ├── .env.local
    ├── package.json
    ├── package-lock.json
    ├── next.config.mjs
    ├── app/
    ├── backend/
    ├── components/
    ├── existing-landing-page/
    ├── lib/
    └── public/
```

---

## 2. Database

### Root backend

| Item | Finding |
|---|---|
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Driver | `psycopg2-binary` |
| Connection setup | [`app/core/database.py`](./app/core/database.py) |
| URL configuration | `DATABASE_URL`, loaded by [`app/core/config.py`](./app/core/config.py) |
| Pool behavior | `pool_pre_ping=True` |
| Session factory | `SessionLocal = sessionmaker(...)` |
| Request session dependency | `get_db()` yields a session and closes it in `finally` |
| Migrations | Alembic |
| Migration directory | [`alembic/`](./alembic) |

The connection setup is:

```python
engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

The configured URL is intentionally omitted here because it contains connection information.

### Root migration files

```text
0001_initial_schema.py
0002_cancellations_and_client_timezone.py
0003_webhook_event_status_tracking.py
0004_call_attempts.py
```

### Run migrations

```powershell
alembic upgrade head
```

Downgrade one revision:

```powershell
alembic downgrade -1
```

The migration environment is configured in [`alembic/env.py`](./alembic/env.py), which imports `app.models` and uses `Base.metadata`.

### Nested backend

The nested backend uses SQLite through [`ai-calling-frontend/backend/app/db/database.py`](./ai-calling-frontend/backend/app/db/database.py):

```python
conn = sqlite3.connect(settings.DB_PATH, timeout=30.0, check_same_thread=False)
conn.row_factory = sqlite3.Row
```

The database file [`ai-calling-frontend/backend/talkaor.db`](./ai-calling-frontend/backend/talkaor.db) exists in the repository.

The nested backend initializes its schema with `init_db()` during FastAPI startup. Alembic migrations for this nested SQLite backend are **NOT PRESENT**.

---

## 3. User, Client, Business, Role, and Tenant Models

### Root `User` model

Actual source from [`app/models/user.py`](./app/models/user.py):

```python
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import UserRole


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        # SUPER_ADMIN has no tenant; every other role must belong to one.
        CheckConstraint(
            "(role = 'super_admin' AND client_id IS NULL) OR "
            "(role <> 'super_admin' AND client_id IS NOT NULL)",
            name="ck_users_role_client",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(str_enum(UserRole, "user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    client = relationship("Client", back_populates="users")
```

Inherited fields from [`app/models/base.py`](./app/models/base.py):

```python
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

#### User fields

| Field | Type | Nullable | Default | Index/constraint |
|---|---|---:|---|---|
| `id` | `int` | No | Database primary-key generation | Primary key |
| `client_id` | `int` foreign key | Yes | None | Indexed; references `clients.id` |
| `name` | `String(150)` | No | None | None |
| `email` | `String(255)` | No | None | Unique and indexed |
| `password_hash` | `String(255)` | No | None | None |
| `role` | String-backed `UserRole` enum | No | None | `user_role` enum validation |
| `is_active` | `Boolean` | No | `True` | None |
| `created_at` | timezone-aware `DateTime` | No | `now()` server default | None |
| `updated_at` | timezone-aware `DateTime` | No | `now()` server default | Updated with SQLAlchemy `onupdate` |

#### User role values

Actual source from [`app/models/enums.py`](./app/models/enums.py):

```python
class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CLIENT_ADMIN = "client_admin"
    CLIENT_STAFF = "client_staff"
```

The database constraint requires:

- `super_admin` users to have `client_id IS NULL`.
- All other roles to have a non-null `client_id`.

### Root `Client` model

Actual source from [`app/models/client.py`](./app/models/client.py):

```python
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, str_enum
from app.models.enums import ClientStatus


class Client(TimestampMixin, Base):
    """A tenant (business). Its `id` is the client_id on every tenant table."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(
        String(64), default="UTC", server_default="UTC", nullable=False)
    status: Mapped[ClientStatus] = mapped_column(
        str_enum(ClientStatus, "client_status"), default=ClientStatus.ACTIVE, nullable=False
    )

    users = relationship("User", back_populates="client")
    agents = relationship("Agent", back_populates="client")
    customers = relationship("Customer", back_populates="client")
```

#### Client fields

| Field | Type | Nullable | Default | Index/constraint |
|---|---|---:|---|---|
| `id` | `int` | No | Database primary-key generation | Primary key |
| `business_name` | `String(200)` | No | None | None |
| `email` | `String(255)` | No | None | Unique |
| `phone` | `String(32)` | Yes | None | None |
| `address` | `Text` | Yes | None | None |
| `timezone` | `String(64)` | No | `"UTC"` | Server default `"UTC"` |
| `status` | String-backed `ClientStatus` enum | No | `active` | `client_status` enum validation |
| `created_at` | timezone-aware `DateTime` | No | `now()` | Inherited |
| `updated_at` | timezone-aware `DateTime` | No | `now()` | Inherited |

`ClientStatus` values are:

```python
class ClientStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
```

### Tenant relationships

`Client` is the tenant/business table. Tenant-owned models include:

- `agents.client_id -> clients.id`
- `customers.client_id -> clients.id`
- `appointments.client_id -> clients.id`
- `calls.client_id -> clients.id`
- `cancellations.client_id -> clients.id`
- `enquiries.client_id -> clients.id`
- `audit_logs.client_id -> clients.id`
- `webhook_events.client_id -> clients.id`
- `call_attempts.client_id -> clients.id`

The complete root model table inventory is:

```text
agents
audit_logs
appointments
appointment_history
calls
call_attempts
cancellations
clients
customers
enquiries
users
webhook_events
```

There is no separate `businesses`, `roles`, or `tenants` SQLAlchemy table. Businesses and tenants are represented by `clients`; roles are represented by the `UserRole` enum.

---

## 4. Authentication

### Root backend authentication type

The root backend uses:

- JWT access tokens.
- JWT refresh tokens.
- `Authorization: Bearer <token>` request headers.
- No server-side session table.
- No HTTP-only authentication cookies.
- Argon2 password hashing.
- Access-token expiry configurable through `ACCESS_TOKEN_EXPIRE_MINUTES`, default `30`.
- Refresh-token expiry configurable through `REFRESH_TOKEN_EXPIRE_DAYS`, default `7`.

### Password hashing and token creation

Actual source from [`app/core/security.py`](./app/core/security.py):

```python
_hasher = PasswordHasher()

def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False
```

JWT claims include:

```python
claims = {
    "sub": str(user_id),
    "client_id": client_id,
    "role": role.value,
    "type": token_type.value,
    "iat": now,
    "exp": now + expires_delta,
    "jti": uuid.uuid4().hex,
}
```

The algorithm is configured by `JWT_ALGORITHM`, defaulting to `HS256`.

### Authentication middleware/dependency

The root authentication dependency is in [`app/core/dependencies.py`](./app/core/dependencies.py):

```python
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise UnauthorizedError()
    payload = decode_token(credentials.credentials, TokenType.ACCESS)
    user = UserRepository(db).get_by_id(payload.user_id)
    # Token claims must still match the DB (tenant or role changed => token is stale).
    if user is None or user.client_id != payload.client_id or user.role != payload.role:
        raise InvalidTokenError()
    if not user.is_active:
        raise ForbiddenError("This user account is disabled", error_code="USER_INACTIVE")
    if user.client is not None and user.client.status != ClientStatus.ACTIVE:
        raise ForbiddenError("This client account is disabled", error_code="CLIENT_DISABLED")
    return user
```

Role dependencies are defined as:

```python
ADMIN_ROLES = (UserRole.SUPER_ADMIN, UserRole.CLIENT_ADMIN)
CLIENT_ROLES = (UserRole.CLIENT_ADMIN, UserRole.CLIENT_STAFF)

SuperAdminUser = Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN))]
ClientAdminUser = Annotated[User, Depends(require_roles(UserRole.CLIENT_ADMIN))]
ClientMemberUser = Annotated[User, Depends(require_roles(*CLIENT_ROLES))]
AnyRoleUser = Annotated[User, Depends(require_roles(*UserRole))]
```

### Signup handler

The root route handler is in [`app/api/routes/auth.py`](./app/api/routes/auth.py):

```python
@router.post("/register", response_model=ApiResponse[AuthData], status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_LIMIT)
def register(request: Request, body: RegisterRequest, db: DbSession):
    user, tokens = AuthService(db).register(body, _ip(request))
    return ApiResponse(message="Registration successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))
```

The service implementation is in [`app/services/auth_service.py`](./app/services/auth_service.py):

```python
def register(self, data: RegisterRequest, ip: str | None) -> tuple[User, TokenPair]:
    # Role is fixed server-side: public registration can only create a CLIENT_ADMIN.
    client, user = provision_client(
        self.db, business_name=data.business_name, email=data.email, phone=data.phone,
        address=None, timezone=data.timezone, admin_name=data.name, admin_email=data.email,
        admin_password=data.password)
    record_audit(self.db, "auth.register", user_id=user.id, client_id=client.id,
                 entity_type="client", entity_id=client.id, ip_address=ip)
    commit_or_conflict(self.db, "Email is already registered", "EMAIL_ALREADY_REGISTERED")
    self.db.refresh(user)
    return user, issue_tokens(user)
```

Public registration:

- Creates a new client/business.
- Creates its first user.
- Always assigns `CLIENT_ADMIN`.
- Does not allow the caller to choose a role or tenant.
- Returns access and refresh tokens immediately.

### Login handler

The root route handler is:

```python
@router.post("/login", response_model=ApiResponse[AuthData])
@limiter.limit(LOGIN_LIMIT)
def login(request: Request, body: LoginRequest, db: DbSession):
    user, tokens = AuthService(db).login(body, _ip(request))
    return ApiResponse(message="Login successful",
                       data=AuthData(user=UserOut.model_validate(user), tokens=tokens))
```

The service implementation is:

```python
def login(self, data: LoginRequest, ip: str | None) -> tuple[User, TokenPair]:
    user = self.users.get_by_email(data.email)
    # Always run one verification so response time doesn't leak whether the email exists.
    valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not valid:
        record_audit(self.db, "auth.login_failed", user_id=user.id if user else None,
                     client_id=user.client_id if user else None, ip_address=ip)
        self.db.commit()
        raise UnauthorizedError("Invalid email or password", error_code="INVALID_CREDENTIALS")
    _ensure_can_authenticate(user)
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    record_audit(self.db, "auth.login", user_id=user.id, client_id=user.client_id,
                 ip_address=ip)
    self.db.commit()
    return user, issue_tokens(user)
```

### Refresh tokens

The root refresh handler is:

```python
@router.post("/refresh", response_model=ApiResponse[TokenPair])
@limiter.limit(REFRESH_LIMIT)
def refresh(request: Request, body: RefreshRequest, db: DbSession):
    return ApiResponse(message="Token refreshed", data=AuthService(db).refresh(body.refresh_token))
```

Refresh tokens are JWTs with `type=refresh`. The refresh endpoint validates:

- Signature.
- Expiry.
- Token type.
- User existence.
- Tenant claim.
- Role claim.
- User active status.
- Client active status.

There is no refresh-token revocation or persistence table in the root backend.

### Logout

A root `/api/v1/auth/logout` route is **NOT PRESENT**.

The frontend calls it anyway and ignores failures.

---

## 5. Roles and Access Control

### Root role system

The root backend has three roles:

| Role | Meaning |
|---|---|
| `super_admin` | Platform-level user with no tenant |
| `client_admin` | Administrator for one client/business |
| `client_staff` | Staff member for one client/business |

Role checks are implemented through [`app/core/dependencies.py`](./app/core/dependencies.py).

### Super admin creation

Super admins cannot be created through public registration. The repository provides a CLI script at [`app/scripts/create_super_admin.py`](./app/scripts/create_super_admin.py):

```powershell
python -m app.scripts.create_super_admin --email you@example.com --name "Your Name"
```

The script prompts for the password and creates:

```python
User(
    client_id=None,
    name=args.name,
    email=args.email.lower(),
    password_hash=hash_password(password),
    role=UserRole.SUPER_ADMIN,
)
```

### Dashboard route protection

Root dashboard routes are protected as follows:

| Route | Required role |
|---|---|
| `GET /api/v1/dashboard/summary` | `client_admin` or `client_staff` |
| `GET /api/v1/dashboard/admin/summary` | `super_admin` |
| `GET /api/v1/dashboard/admin/clients/{client_id}/summary` | `super_admin` |

Tenant IDs are derived from the authenticated user token/database record, not accepted as arbitrary request tenant context for client-user routes.

### Nested backend roles

The nested backend uses string roles including:

```text
SUPER_ADMIN
BUSINESS_ADMIN
STAFF
CLIENT_ADMIN
CLIENT_STAFF
```

Its dependency layer normalizes `CLIENT_ADMIN` to `BUSINESS_ADMIN` and `CLIENT_STAFF` to `STAFF`. This is separate behavior from the root backend's enum values.

---

## 6. API Conventions

### Route prefix

Root routes are mounted under:

```text
/api/v1
```

Defined in [`app/api/router.py`](./app/api/router.py):

```python
api_router = APIRouter(prefix="/api/v1")
```

### Request validation

The root backend uses:

- FastAPI parameter and body parsing.
- Pydantic v2 models.
- `EmailStr`.
- `Field(...)` length constraints.
- `field_validator`.
- Custom validators such as password strength and timezone validation.

### Success response format

Root single-resource responses use [`ApiResponse`](./app/schemas/common.py):

```python
class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None
```

Example:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {},
    "tokens": {}
  }
}
```

Paginated responses use:

```python
class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: Pagination
```

Example:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### Error response format

Defined in [`app/schemas/common.py`](./app/schemas/common.py):

```python
class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: str
    errors: list[FieldError] | None = None
```

Example:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "error_code": "INVALID_CREDENTIALS"
}
```

### Error handling

Centralized handlers are registered in [`app/core/exceptions.py`](./app/core/exceptions.py) for:

- Application errors.
- Pydantic/FastAPI validation errors.
- Starlette HTTP errors.
- SlowAPI rate-limit errors.
- Unhandled exceptions.

Unhandled exceptions are logged with the request ID and return:

```json
{
  "success": false,
  "message": "Internal server error",
  "error_code": "INTERNAL_ERROR"
}
```

### Sample route file

The complete root agent route file is [`app/api/routes/agents.py`](./app/api/routes/agents.py):

```python
from fastapi import APIRouter, Query, Request, status

from app.core.dependencies import ClientAdminUser, ClientMemberUser, DbSession, TenantId
from app.models.enums import AgentStatus
from app.schemas.agent import AgentCreate, AgentOut, AgentUpdate
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.agent_service import AgentService
from app.utils.pagination import PageParamsDep, paginated

router = APIRouter()


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[AgentOut])
def list_agents(_: ClientMemberUser, tenant_id: TenantId, db: DbSession, page: PageParamsDep,
                status_filter: AgentStatus | None = Query(None, alias="status"),
                provider: str | None = None):
    items, total = AgentService(db, tenant_id).list(page.offset, page.limit,
                                                     status=status_filter, provider=provider)
    return paginated(items, total, page, AgentOut)


@router.post("", response_model=ApiResponse[AgentOut], status_code=status.HTTP_201_CREATED)
def create_agent(request: Request, body: AgentCreate, actor: ClientAdminUser, tenant_id: TenantId,
                 db: DbSession):
    agent = AgentService(db, tenant_id).create(body, actor, _ip(request))
    return ApiResponse(message="Agent created successfully", data=AgentOut.model_validate(agent))


@router.get("/{agent_id}", response_model=ApiResponse[AgentOut])
def get_agent(agent_id: int, _: ClientMemberUser, tenant_id: TenantId, db: DbSession):
    return ApiResponse(message="Agent retrieved successfully",
                       data=AgentOut.model_validate(AgentService(db, tenant_id).get(agent_id)))


@router.patch("/{agent_id}", response_model=ApiResponse[AgentOut])
def update_agent(request: Request, agent_id: int, body: AgentUpdate, actor: ClientAdminUser,
                 tenant_id: TenantId, db: DbSession):
    agent = AgentService(db, tenant_id).update(agent_id, body, actor, _ip(request))
    return ApiResponse(message="Agent updated successfully", data=AgentOut.model_validate(agent))


@router.delete("/{agent_id}", response_model=ApiResponse[None])
def delete_agent(request: Request, agent_id: int, actor: ClientAdminUser, tenant_id: TenantId,
                 db: DbSession):
    AgentService(db, tenant_id).delete(agent_id, actor, _ip(request))
    return ApiResponse(message="Agent deleted successfully")
```

---

## 7. Email

An email service is **NOT PRESENT**.

The repository does not contain configured SMTP, SendGrid, Resend, Nodemailer, or equivalent email delivery code.

There are email fields in user/client schemas and database models, but no email transport, templates, or email configuration.

---

## 8. Environment Variables

### Root backend variables

Defined by [`app/core/config.py`](./app/core/config.py):

```text
APP_NAME
APP_ENV
DEBUG
DATABASE_URL
JWT_SECRET_KEY
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS
SARVAM_API_KEY
SARVAM_BASE_URL
SARVAM_WEBHOOK_SECRET
DEFAULT_TIMEZONE
CORS_ORIGINS
RATE_LIMIT_ENABLED
```

Additional process variables used in [`gunicorn.conf.py`](./gunicorn.conf.py):

```text
PORT
WEB_CONCURRENCY
GUNICORN_TIMEOUT
```

The settings loader is:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

and:

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### Test environment variables

Used in [`tests/conftest.py`](./tests/conftest.py):

```text
APP_ENV
TEST_DATABASE_URL
DATABASE_URL
RATE_LIMIT_ENABLED
JWT_SECRET_KEY
SARVAM_WEBHOOK_SECRET
```

### Frontend variables

Used by [`ai-calling-frontend/lib/api/client.ts`](./ai-calling-frontend/lib/api/client.ts), [`ai-calling-frontend/lib/mock/storage.ts`](./ai-calling-frontend/lib/mock/storage.ts), and [`ai-calling-frontend/next.config.mjs`](./ai-calling-frontend/next.config.mjs):

```text
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_USE_MOCK
BACKEND_INTERNAL_URL
```

### Nested backend variables

Used by [`ai-calling-frontend/backend/app/core/config.py`](./ai-calling-frontend/backend/app/core/config.py):

```text
JWT_SECRET_KEY
BUSINESS_ADMIN_ACCESS_CODE
SWAGGER_SUPER_ADMIN_KEY
TALKAOR_DB_PATH
```

---

## 9. Existing Endpoints

The following table covers the root backend routes.

### Root backend route table

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Database-backed health check |
| POST | `/api/v1/auth/register` | Public | Create client and first client admin |
| POST | `/api/v1/auth/login` | Public | Authenticate and issue tokens |
| POST | `/api/v1/auth/refresh` | Public | Refresh JWT pair |
| GET | `/api/v1/auth/me` | Bearer token | Get current user |
| GET | `/api/v1/clients/me` | Client admin/staff | Get own business profile |
| PATCH | `/api/v1/clients/me` | Client admin | Update own business profile |
| POST | `/api/v1/clients` | Super admin | Create a client/business |
| GET | `/api/v1/clients` | Super admin | List clients |
| GET | `/api/v1/clients/{client_id}` | Super admin | Get client |
| PATCH | `/api/v1/clients/{client_id}` | Super admin | Update client |
| POST | `/api/v1/clients/{client_id}/disable` | Super admin | Disable client |
| POST | `/api/v1/clients/{client_id}/enable` | Super admin | Enable client |
| GET | `/api/v1/clients/{client_id}/users` | Super admin | List client users |
| GET | `/api/v1/clients/{client_id}/agents` | Super admin | List client agents |
| GET | `/api/v1/users` | Client admin | List users in own client |
| POST | `/api/v1/users` | Client admin | Create user in own client |
| GET | `/api/v1/users/{user_id}` | Client admin | Get user in own client |
| PATCH | `/api/v1/users/{user_id}` | Client admin | Update user in own client |
| GET | `/api/v1/customers` | Client admin/staff | List customers |
| GET | `/api/v1/customers/{customer_id}` | Client admin/staff | Get customer |
| POST | `/api/v1/customers` | Client admin | Create customer |
| PATCH | `/api/v1/customers/{customer_id}` | Client admin | Update customer |
| DELETE | `/api/v1/customers/{customer_id}` | Client admin | Delete customer |
| GET | `/api/v1/appointments` | Client admin/staff | List appointments |
| POST | `/api/v1/appointments` | Client admin/staff | Create appointment |
| GET | `/api/v1/appointments/{appointment_id}` | Client admin/staff | Get appointment |
| PATCH | `/api/v1/appointments/{appointment_id}` | Client admin/staff | Update appointment |
| DELETE | `/api/v1/appointments/{appointment_id}` | Client admin | Delete appointment |
| GET | `/api/v1/appointments/{appointment_id}/history` | Client admin/staff | Get appointment history |
| POST | `/api/v1/appointments/{appointment_id}/cancel` | Client admin/staff | Cancel appointment |
| POST | `/api/v1/appointments/{appointment_id}/reschedule` | Client admin/staff | Reschedule appointment |
| GET | `/api/v1/cancellations` | Client admin/staff | List cancellations |
| GET | `/api/v1/cancellations/{cancellation_id}` | Client admin/staff | Get cancellation |
| GET | `/api/v1/calls` | Any authenticated role | List calls |
| GET | `/api/v1/calls/{call_id}` | Any authenticated role | Get call details |
| GET | `/api/v1/agents` | Client admin/staff | List agents |
| POST | `/api/v1/agents` | Client admin | Create agent |
| GET | `/api/v1/agents/{agent_id}` | Client admin/staff | Get agent |
| PATCH | `/api/v1/agents/{agent_id}` | Client admin | Update agent |
| DELETE | `/api/v1/agents/{agent_id}` | Client admin | Delete agent |
| GET | `/api/v1/dashboard/summary` | Client admin/staff | Tenant dashboard summary |
| GET | `/api/v1/dashboard/admin/summary` | Super admin | Platform dashboard summary |
| GET | `/api/v1/dashboard/admin/clients/{client_id}/summary` | Super admin | Dashboard for selected client |
| POST | `/api/v1/webhooks/sarvam` | Sarvam signature | Receive Sarvam webhook |
| POST | `/api/v1/webhooks/sarvam/{token}/outbound` | Shared Sarvam token | Queue outbound Sarvam processing |
| POST | `/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/check-slot` | Shared Sarvam token | Check appointment availability |
| POST | `/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/book` | Shared Sarvam token | Book appointment |
| POST | `/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/reschedule` | Shared Sarvam token | Reschedule appointment |
| POST | `/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/cancel` | Shared Sarvam token | Cancel appointment |

The root route source files are under [`app/api/routes/`](./app/api/routes).

### Root routes that are not present

These frontend-called routes do not exist in the root backend route declarations:

```text
/api/v1/auth/logout
/api/v1/auth/verify-admin-code
/api/v1/admin/...
/api/v1/super-admin/...
```

### Nested backend route table

The nested app mounts its routers under `/api/v1` and additionally exposes `/health`.

Nested-only or nested-specific routes include:

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/auth/me` | Bearer token |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/verify-admin-code` | Bearer/role dependency |
| GET | `/api/v1/dashboard/summary` | Auth dependency |
| GET | `/api/v1/appointments` | Auth dependency |
| POST | `/api/v1/appointments` | Auth dependency |
| PATCH | `/api/v1/appointments/{id}` | Auth dependency |
| POST | `/api/v1/appointments/{id}/cancel` | Auth dependency |
| POST | `/api/v1/appointments/{id}/reschedule` | Auth dependency |
| POST | `/api/v1/appointments/{id}/restore` | Auth dependency |
| GET | `/api/v1/appointments/{id}/history` | Auth dependency |
| GET | `/api/v1/customers` | Auth dependency |
| POST | `/api/v1/customers` | Auth dependency |
| PATCH | `/api/v1/customers/{id}` | Auth dependency |
| DELETE | `/api/v1/customers/{id}` | Auth dependency |
| GET | `/api/v1/calls` | Auth dependency |
| GET | `/api/v1/calls/{id}` | Auth dependency |
| GET | `/api/v1/calls/{id}/recording` | Auth dependency |
| GET | `/api/v1/cancellations` | Auth dependency |
| GET | `/api/v1/agents` | Auth dependency |
| POST | `/api/v1/agents` | Auth dependency |
| PATCH | `/api/v1/agents/{id}` | Auth dependency |
| PATCH | `/api/v1/agents/{id}/status` | Auth dependency |
| DELETE | `/api/v1/agents/{id}` | Auth dependency |
| GET | `/api/v1/users` | Auth dependency |
| POST | `/api/v1/users` | Auth dependency |
| PATCH | `/api/v1/users/{id}` | Auth dependency |
| GET | `/api/v1/clients/me` | Auth dependency |
| PATCH | `/api/v1/clients/me` | Auth dependency |
| GET | `/api/v1/admin/appointments` | Business-admin dependency |
| PATCH | `/api/v1/admin/appointments/{id}` | Business-admin dependency |
| POST | `/api/v1/admin/appointments/{id}/reschedule` | Business-admin dependency |
| POST | `/api/v1/admin/appointments/{id}/cancel` | Business-admin dependency |
| POST | `/api/v1/admin/appointments/{id}/restore` | Business-admin dependency |
| GET | `/api/v1/admin/calls` | Business-admin dependency |
| GET | `/api/v1/admin/calls/{id}/recording` | Business-admin dependency |
| GET | `/api/v1/admin/agents` | Business-admin dependency |
| PATCH | `/api/v1/admin/agents/{id}/status` | Business-admin dependency |
| GET | `/api/v1/admin/business` | Business-admin dependency |
| PATCH | `/api/v1/admin/business` | Business-admin dependency |
| GET | `/api/v1/super-admin/dashboard` | Super-admin dependency |
| GET | `/api/v1/super-admin/businesses` | Super-admin dependency |
| GET | `/api/v1/super-admin/businesses/{id}` | Super-admin dependency |
| PATCH | `/api/v1/super-admin/businesses/{id}/status` | Super-admin dependency |
| GET | `/api/v1/super-admin/logs` | Super-admin dependency |
| GET | `/api/v1/super-admin/revenue` | Super-admin dependency |
| GET | `/api/v1/super-admin/agents` | Super-admin dependency |
| GET | `/api/v1/super-admin/system-health` | Super-admin dependency |
| GET | `/api/v1/super-admin/settings` | Super-admin dependency |
| PATCH | `/api/v1/super-admin/settings` | Super-admin dependency |

The nested route implementations are under [`ai-calling-frontend/backend/app/api/v1/endpoints/`](./ai-calling-frontend/backend/app/api/v1/endpoints).

---

## 10. Frontend Connection

### Frontend API configuration

The frontend API client is [`ai-calling-frontend/lib/api/client.ts`](./ai-calling-frontend/lib/api/client.ts).

It uses:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';
```

When `NEXT_PUBLIC_USE_MOCK` is not exactly `"false"`, mock mode is enabled.

When real API mode is enabled, the client:

- Uses `fetch`.
- Sends JSON.
- Stores tokens in browser `localStorage` through [`ai-calling-frontend/lib/mock/storage.ts`](./ai-calling-frontend/lib/mock/storage.ts).
- Sends the access token in an `Authorization` header.
- Automatically attempts refresh on token expiry.
- Uses a 20-second request timeout.

### Frontend calls matching the root backend

```text
/api/v1/auth/login
/api/v1/auth/me
/api/v1/auth/refresh
/api/v1/agents
/api/v1/agents/{id}
/api/v1/appointments
/api/v1/appointments/{id}
/api/v1/appointments/{id}/cancel
/api/v1/appointments/{id}/reschedule
/api/v1/appointments/{id}/history
/api/v1/calls
/api/v1/calls/{id}
/api/v1/cancellations
/api/v1/clients/me
/api/v1/customers
/api/v1/customers/{id}
/api/v1/dashboard/summary
/api/v1/users
/api/v1/users/{id}
```

### Frontend calls not present in the root backend

```text
/api/v1/auth/logout
/api/v1/auth/verify-admin-code

/api/v1/admin/appointments
/api/v1/admin/appointments/{id}
/api/v1/admin/appointments/{id}/reschedule
/api/v1/admin/appointments/{id}/cancel
/api/v1/admin/appointments/{id}/restore
/api/v1/admin/calls
/api/v1/admin/calls/{id}/recording
/api/v1/admin/agents
/api/v1/admin/agents/{id}/status
/api/v1/admin/business

/api/v1/super-admin/dashboard
/api/v1/super-admin/businesses
/api/v1/super-admin/businesses/{id}
/api/v1/super-admin/businesses/{id}/status
/api/v1/super-admin/logs
/api/v1/super-admin/revenue
/api/v1/super-admin/agents
/api/v1/super-admin/system-health
/api/v1/super-admin/settings
```

Those routes do exist in the nested backend under `ai-calling-frontend/backend`.

### CORS

The root CORS setup is in [`app/main.py`](./app/main.py):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Origins come from the comma-separated `CORS_ORIGINS` environment variable.

The repository's root `.env` does not define `CORS_ORIGINS`, so the configured origin list is empty unless supplied externally.

The nested backend instead configures:

```python
allow_origins=["*"],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
```

in [`ai-calling-frontend/backend/app/main.py`](./ai-calling-frontend/backend/app/main.py).

### Frontend build serving

The frontend is a Next.js application.

Production commands:

```powershell
cd ai-calling-frontend
npm run build
npm start
```

The Next.js rewrite configuration is in [`ai-calling-frontend/next.config.mjs`](./ai-calling-frontend/next.config.mjs):

```javascript
{
  source: '/api/:path*',
  destination: `${process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'}/api/:path*`,
}
```

The root route is rewritten to `/landing.html`.

There is no root Dockerfile or compose service that builds and serves the Next.js frontend. The root [`Dockerfile`](./Dockerfile) builds only the Python backend.

---

## 11. Code Style, Linting, Formatting, and Tests

### Python style

Observed conventions:

- `snake_case` functions and variables.
- `PascalCase` classes.
- Type annotations throughout the root backend.
- SQLAlchemy 2.0 `Mapped[...]` and `mapped_column`.
- Pydantic models for request/response schemas.
- Repository/service/route separation.
- `APIRouter` modules grouped by resource.
- Comments are used for non-obvious security and tenant-isolation rules.

Python formatter configuration:

- Black configuration: **NOT PRESENT**
- Ruff configuration: **NOT PRESENT**
- Flake8 configuration: **NOT PRESENT**
- Mypy configuration: **NOT PRESENT**

### Frontend style

Observed conventions:

- TypeScript with React components.
- `camelCase` functions and variables.
- `PascalCase` React components and types.
- Absolute imports through `@/*`.
- Strict TypeScript mode is enabled in [`ai-calling-frontend/tsconfig.json`](./ai-calling-frontend/tsconfig.json).
- Tailwind CSS is configured in [`ai-calling-frontend/tailwind.config.ts`](./ai-calling-frontend/tailwind.config.ts).

Frontend linting:

```json
"lint": "next lint"
```

An ESLint configuration file is **NOT PRESENT** in the repository root or frontend root.

Prettier configuration is **NOT PRESENT**.

### Tests

The root backend uses pytest and pytest-cov:

```text
pytest==8.3.3
pytest-cov==5.0.0
```

Tests are under [`tests/`](./tests), including:

```text
test_auth.py
test_authorization.py
test_multi_tenant_security.py
test_dashboard.py
test_users.py
test_clients.py
test_agents.py
test_appointments.py
test_calls.py
test_customers.py
test_cancellations.py
test_health.py
test_error_handlers.py
test_middleware.py
test_security.py
test_sarvam_webhooks.py
test_sarvam_public_webhooks.py
```

Run the test suite:

```powershell
pytest
```

The test setup in [`tests/conftest.py`](./tests/conftest.py) requires PostgreSQL by default and uses `TEST_DATABASE_URL` if supplied.

### Sample test

Actual source from [`tests/test_health.py`](./tests/test_health.py):

```python
def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["status"] == "healthy" and data["database"] == "up"


def test_health_needs_no_authentication(client):
    assert client.get("/api/v1/health").status_code == 200


def test_health_reports_down_database_as_503(client, monkeypatch):
    from app.api.routes import health as health_module

    def broken_execute(*args, **kwargs):
        raise Exception("connection refused")

    monkeypatch.setattr("sqlalchemy.orm.Session.execute", broken_execute)
    r = client.get("/api/v1/health")
    assert r.status_code == 503
    assert r.json()["data"] == {"status": "unhealthy", "database": "down"}
    assert "connection refused" not in r.text
```

---

## Important implementation distinction

The nested backend is not simply another configuration of the root backend. It has materially different:

- Database technology.
- User ID representation.
- Role names.
- Password hashing.
- JWT expiry defaults.
- CORS behavior.
- Admin and super-admin routes.
- Response conventions.
- Route availability.

Both backends are present in the repository and can expose overlapping `/api/v1` paths if started independently.
