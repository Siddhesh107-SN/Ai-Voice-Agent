# AI Calling Backend

Multi-tenant FastAPI backend for AI calling agents (Stage 1: project setup).

## Run locally
    cp .env.example .env
    docker compose up --build
Swagger: http://localhost:8000/docs  |  Health: /api/v1/health

## Without Docker
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload

## Migrations
    alembic revision --autogenerate -m "message"   # create
    alembic upgrade head                            # run
    alembic downgrade -1                            # rollback

## Tests
    pytest

## Database (Stage 2)
Tables: clients, users, agents, customers, appointments, appointment_history,
calls, enquiries, audit_logs, webhook_events. Every tenant table carries `client_id`,
and cross-table references use composite foreign keys `(client_id, id)`, so the
database itself rejects e.g. an appointment that points at another tenant's customer.
Enums are stored as VARCHAR, so adding a status needs no `ALTER TYPE`.

## Authentication (Stage 3)
- `POST /api/v1/auth/register` creates a new client (tenant) plus its first CLIENT_ADMIN.
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`.
- Send `Authorization: Bearer <access_token>`. In Swagger (/docs) use **Authorize** and paste the token.
- Passwords: Argon2id. Tokens carry `sub` (user id), `client_id`, `role`, `type`, `exp`.
- The user is re-loaded from the DB on every request, so disabling a user or client takes effect immediately.
- SUPER_ADMIN cannot be created via the API: `python -m app.scripts.create_super_admin --email you@x.com --name "You"`.

## Tests
Tests need PostgreSQL. Create a test database and point to it:
    createdb ai_calling_test
    export TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ai_calling_test
    pytest

## Multi-tenancy (Stage 4)
- The tenant is **always** taken from the authenticated user (`TenantId` dependency), never from
  query parameters or request bodies.
- Tenant-owned tables are accessed through `TenantRepository`, which filters every query by
  `client_id` and forces it on insert.
- Another tenant's record returns **404** (same body as a missing record), so IDs can't be probed.
- SUPER_ADMIN has no tenant and is refused by tenant endpoints; it uses `/api/v1/clients/*`.
- `tests/test_multi_tenant_security.py` also contains structural guards: every table needs a
  `client_id` foreign key, and every `/api/v1` route must require authentication unless allow-listed.

### Endpoints added
| Endpoint | Who |
|---|---|
| `GET/PATCH /clients/me` | any client user / CLIENT_ADMIN |
| `POST/GET /clients`, `GET/PATCH /clients/{id}`, `POST /clients/{id}/disable|enable`, `GET /clients/{id}/users` | SUPER_ADMIN |
| `GET/POST /users`, `GET/PATCH /users/{id}` | CLIENT_ADMIN (own client only) |

## Customers & appointments (Stage 5)
| Endpoint | Who |
|---|---|
| `GET /customers`, `GET /customers/{id}` | CLIENT_ADMIN, CLIENT_STAFF |
| `POST/PATCH/DELETE /customers` | CLIENT_ADMIN |
| `GET/POST /appointments`, `GET/PATCH /appointments/{id}`, `GET /appointments/{id}/history` | CLIENT_ADMIN, CLIENT_STAFF |
| `DELETE /appointments/{id}` | CLIENT_ADMIN |

- List filters: `status`, `date`, `date_from`, `date_to`, `customer`; pagination via `page` and `limit` (max 100).
- Phone numbers are normalized (`+91 98765-43210` -> `+919876543210`) and unique per client.
- `PATCH` edits notes, customer and status only. Date/time changes and cancellation go through the
  reschedule/cancel endpoints (Stage 6) so they are recorded in the history trail.
- A customer can't have two active appointments at the same date and time.

## Cancellation & rescheduling (Stage 6)
| Endpoint | Who |
|---|---|
| `POST /appointments/{id}/cancel` (optional `{"reason": "..."}`) | CLIENT_ADMIN, CLIENT_STAFF |
| `POST /appointments/{id}/reschedule` (`new_date`, `new_time`, optional `reason`) | CLIENT_ADMIN, CLIENT_STAFF |
| `GET /cancellations`, `GET /cancellations/{id}` (filters: `customer`, `source`, `date_from`, `date_to`) | CLIENT_ADMIN, CLIENT_STAFF |

- Only upcoming appointments can be cancelled or rescheduled (not cancelled/completed ones).
- A new slot must differ from the current one, must not be in the past (checked in the client's
  timezone, set with `PATCH /clients/me {"timezone": "Asia/Kolkata"}`), and must not clash with the
  same customer's other active appointments.
- Every cancel/reschedule writes an `appointment_history` row (old and new slot, status, actor, reason).
  Cancellations also get their own row, including whether a user or the AI agent did it.
- `AgentRequestService` is the entry point for AI-agent requests (used by the Stage 9 webhook).
  The agent must supply the customer's phone number AND an appointment that belongs to that customer
  within the tenant. Any mismatch returns the same generic "not found".
- Migration `0002` adds `cancellations` and `clients.timezone`. Set `DEFAULT_TIMEZONE` in `.env`.

## Call history (Stage 7)
| Endpoint | Who |
|---|---|
| `GET /calls`, `GET /calls/{id}` | CLIENT_ADMIN, CLIENT_STAFF (own client), SUPER_ADMIN (all clients) |

- Filters: `status`, `agent`, `customer`, `direction`, `date`, `date_from`, `date_to` (dates use the
  client's timezone; a call's date is when it started). Newest first, paginated.
- The list omits transcripts and recording links. `GET /calls/{id}` includes them for CLIENT_ADMIN and
  SUPER_ADMIN; for CLIENT_STAFF they are `null` (the `has_transcript` / `has_recording` flags stay).
- SUPER_ADMIN may add `?client_id=` to narrow to one client; for client users that parameter is ignored.
- Calls are written by provider webhooks (Stage 9); there is intentionally no public create endpoint.

## AI agents (Stage 8)
| Endpoint | Who |
|---|---|
| `GET /agents`, `GET /agents/{id}` | CLIENT_ADMIN, CLIENT_STAFF (own client) |
| `POST/PATCH/DELETE /agents` | CLIENT_ADMIN (own client) |
| `GET /clients/{client_id}/agents` | SUPER_ADMIN (any client) |

- `provider` is a free string (default `sarvam`); adding a new provider needs no migration.
- `(provider, provider_agent_id)` is unique **platform-wide**, not just per client, since it
  identifies one real resource at the provider. Filters: `status`, `provider`.
- `configuration` is a free-form JSON object (voice, prompt, language, etc.). Audit log entries
  record which fields changed, never the configuration content or phone number.
- Calls (Stage 7) reference an agent by id; the composite foreign key still guarantees an agent
  can only be linked to calls of its own client.

## Sarvam integration & webhooks (Stage 9)
- `app/integrations/sarvam/client.py` — thin outbound HTTP client (Sarvam's exact endpoint
  paths aren't public in this environment; the methods are illustrative, kept behind
  `SarvamService` so swapping providers means adding one file, not touching call sites).
- `app/integrations/sarvam/webhook.py` — HMAC-SHA256 signature verification (`SARVAM_WEBHOOK_SECRET`).
  A blank secret fails closed. If Sarvam's real signing scheme differs, only this file changes.
- `app/integrations/sarvam/schemas.py` — the wire format for incoming events.
- `POST /api/v1/webhooks/sarvam` — the only unauthenticated `/api/v1` route (it's authenticated
  by signature instead of JWT). Header: `X-Sarvam-Signature: <hex hmac-sha256 of the raw body>`.

### How a webhook is processed
1. **Signature check** on the raw bytes, before anything is parsed — a bad signature is a 401.
2. **Parse & validate** the envelope — a malformed body or an event missing its required
   `call`/`appointment` data is a 400.
3. **Claim the event**: insert into `webhook_events` keyed by `(provider, event_id)`. A repeat
   delivery is detected here and returns `"status": "duplicate"` without touching any other table.
4. **Resolve the tenant from `agent_id` alone** (our `Agent.provider_agent_id`) — the payload has
   no `client_id` field, so nothing in it can target another tenant. An unknown `agent_id` is
   recorded as `"failed"`.
5. **Dispatch by `event_type`**:
   - `call_started` / `call_completed` — create or update a `Call` row (matched by
     `provider_call_id`), optionally linking an existing customer by phone.
   - `appointment_created` — books a new appointment; a first-time caller's `Customer` is
     created automatically (falls back to "Unknown Caller" if no name is given).
   - `appointment_cancelled` / `appointment_rescheduled` — routed through `AgentRequestService`
     (Stage 6): the caller's phone number and the appointment must belong to the same customer,
     in the resolved tenant. Any mismatch is recorded as `"failed"`, not applied.
6. A business-rule failure (double booking, appointment already cancelled, etc.) is caught,
   recorded on the `webhook_events` row with its error, and the response is still **200** — the
   event was received and won't succeed on a retry either, so there's no reason to ask the
   provider to resend it. Only signature and payload problems return 4xx.

Migration `0003` adds `status`/`error_message` to `webhook_events` for this.

## Dashboard (Stage 10)
| Endpoint | Who |
|---|---|
| `GET /dashboard/summary` | CLIENT_ADMIN, CLIENT_STAFF — their own client's stats |
| `GET /dashboard/admin/summary` | SUPER_ADMIN — platform-wide stats across every client |
| `GET /dashboard/admin/clients/{client_id}/summary` | SUPER_ADMIN — one client's stats (same shape as that client's own view) |

- Client summary: `total_appointments`, `today_appointments`, `scheduled_appointments`
  (scheduled + confirmed + rescheduled), `cancelled_appointments`, `completed_appointments`,
  `total_customers`, `total_agents`, `active_agents`, `total_calls`, `calls_today`.
- Platform summary: `total_clients`, `active_clients`, `disabled_clients`, `total_users`,
  `total_agents`, `total_customers`, `total_appointments`, `total_calls`, `calls_today`.
- "Today" uses the client's own timezone for the client summary, and UTC for the platform
  summary (there's no single timezone across clients).
- All figures are computed with `COUNT` queries scoped by `client_id`; nothing is cached, so
  the numbers are always current as of the request.

## Testing (Stage 11)
240 tests, 99% line coverage (`pytest --cov=app --cov-report=term-missing`), all passing against
real PostgreSQL 16 — no mocked database anywhere.

| File | Covers |
|---|---|
| `test_auth.py` | registration, login, invalid password, expired/forged/tampered tokens, refresh, password rehashing |
| `test_authorization.py` | `require_roles`, `TenantId` resolution |
| `test_clients.py`, `test_users.py` | Clients/Users APIs (functional, not isolation) |
| `test_customers.py`, `test_appointments.py`, `test_cancellations.py`, `test_reschedule.py`, `test_agents.py`, `test_calls.py`, `test_dashboard.py` | one file per resource, matching the required structure |
| `test_agent_requests.py`, `test_sarvam_webhooks.py`, `test_sarvam_client.py` | the AI-agent path and the Sarvam webhook/client integration |
| `test_multi_tenant_security.py` | **the mandatory suite** — every resource's cross-tenant isolation, structural guards (every table has `client_id`, every route requires auth unless allow-listed), and `test_mandatory_acceptance_scenario_end_to_end`, which runs the spec's acceptance checklist literally: Client A/B, User A/B, Appointment A/B, then confirms User A can see/modify/cancel only Appointment A and never Appointment B's appointment, customers, agents or calls — and the same from Client B's side |
| `test_validators_and_helpers.py`, `test_error_handlers.py`, `test_create_super_admin_script.py` | pure-function edge cases, the generic 500/429 handlers, and the CLI script that provisions SUPER_ADMIN |

Run everything:
    createdb ai_calling_test
    export TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ai_calling_test
    pytest --cov=app --cov-report=term-missing

## Deployment (Stage 12)

### Container
- `Dockerfile` installs pinned dependencies, runs as a non-root user, and its default `CMD`
  runs **gunicorn** with `uvicorn.workers.UvicornWorker` (`gunicorn.conf.py`) — several worker
  processes, periodic worker recycling (`max_requests`) to bound any slow leak, and an access
  log format that never includes query strings or bodies (so tokens/passwords can't land in logs).
  `WEB_CONCURRENCY` sizes the worker count for the host; `PORT` is honored for platforms that
  inject it (Render, Railway, Heroku-style). A `HEALTHCHECK` polls `/api/v1/health`.
- `docker-compose.yml` is the **local dev** stack only: it runs its own Postgres, mounts the
  source for live reload, and runs `alembic upgrade head` on every start — fine for one dev
  container, wrong for production (see below).
- `docker-compose.prod.yml` is a starting point for a real deployment: an external managed
  Postgres (RDS/Cloud SQL/etc — not started by compose), gunicorn, a restart policy, and a
  container healthcheck.
- `.dockerignore` keeps `.git`, `.env`, tests and caches out of the image.

### Migrations: run as a release step, not on every container start
Running `alembic upgrade head` inside every replica's startup (as the *dev* compose file does
for convenience) races when several replicas start at once. In production, run migrations
**once**, before rolling out new containers:
    docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
Then deploy/restart the `api` service. Keep migrations backward-compatible with the previous
code version during a rolling deploy (add columns as nullable first, backfill, then tighten).

### Required configuration
- **`JWT_SECRET_KEY`** — `Settings` refuses to start with `APP_ENV=production` unless this is
  32+ characters and not the placeholder value. Generate one with
  `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- **`DATABASE_URL`** — point at the production database; never the one in `docker-compose.yml`.
- **`CORS_ORIGINS`** — defaults to empty (no origins allowed) if unset. Set it explicitly to
  your frontend's real origin(s); never `*` in production.
- **`SARVAM_WEBHOOK_SECRET`** — must match what's configured on Sarvam's side, or every webhook
  is rejected with 401 (see Stage 9). A blank secret fails closed by design.
- Provision the platform's first user with `python -m app.scripts.create_super_admin` — do this
  once, then use its login to create clients.

### Known scaling limitation
The webhook and login/register/refresh rate limits (`slowapi`) are **in-memory per process**.
With gunicorn running several workers (or several container replicas), each one enforces its
own limit independently — the effective limit is `configured_limit × worker_count`, not a
shared one. This is fine for basic abuse protection at small-to-medium scale; for a strict,
shared limit across all replicas, back the limiter with Redis (`slowapi` supports this via a
`storage_uri`) — a one-line change in `app/core/rate_limit.py` when needed.

### Operational notes
- Every response carries an `X-Request-ID` header (generated, or echoed back if a trusted
  upstream proxy already set one) — use it to correlate a user's bug report with server logs.
  The 500-handler's log line includes it.
- `GET /api/v1/health` checks real database connectivity (one `SELECT 1`) and returns 503 if
  the database is unreachable — wire it as both the liveness and readiness probe; it's cheap
  enough to poll frequently and never leaks the underlying DB error text.
- The app is stateless apart from the database (no server-side sessions, no local file
  storage), so it scales horizontally by simply running more `api` containers behind a load
  balancer that terminates TLS — this app does not handle HTTPS itself.
