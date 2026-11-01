# TalkAor

TalkAor is a multi-tenant AI calling platform. The repository contains a FastAPI
backend at the root and a Next.js frontend in `ai-calling-frontend/`.

## Architecture

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, and PostgreSQL.
  `/api/v1` contains authentication, tenant dashboard and scheduling APIs,
  billing, administration, and Sarvam integration endpoints. Tenant API
  dependencies derive the client scope from the verified access token.
- **Frontend:** Next.js 14 and React 18. The Next.js server rewrites `/api/v1`
  requests to `BACKEND_INTERNAL_URL`; browser requests use the API client in
  `src/lib/http.ts`. Live mode is the default. Mock mode is for non-production
  previews only. Dashboard role routing uses a server-verified, signed
  HttpOnly session cookie; bearer and refresh tokens remain in localStorage.
  Configure `SESSION_COOKIE_SECRET` with at least 32 random bytes; all frontend
  instances must share the same stable value. Super-admin initial loads use
  platform endpoints only and skip tenant-scoped polling.
- **Rate limiting:** By default, limits use the ASGI request peer address
  (`request.client.host`), preserving existing behavior. When deployed behind
  a trusted reverse proxy, set backend `TRUSTED_PROXY_COUNT` to the exact
  proxy count so the limiter selects from the right side of the forwarded-IP
  chain; see the [deployment runbook](./docs/DEPLOY_RUNBOOK.md) for Nginx
  configuration and the proxy-header trust warning.
- **Database:** Alembic migrations are in `alembic/versions/`. Keep application
  and migration changes coordinated; back up the production database before
  applying migrations.
- **Sarvam:** Per-client tool credentials and webhook routes are supported.
  Provider-console details that this repository cannot verify are documented
  in [docs/SARVAM_SETUP.md](./docs/SARVAM_SETUP.md).
  `SARVAM_LEGACY_SHARED_TOKEN_ENABLED` defaults to `true` during migration and
  causes a production startup warning until it is disabled after cutover.
- **Authentication:** Signup email verification is database-backed. Forgotten
  passwords use a one-time email code. Both email flows require working SMTP
  or Resend delivery in production; the console backend does not send codes.
  Production startup rejects `DEBUG=true`, weak JWT secrets, and a missing PIN
  encryption key. The legacy Sarvam shared-token setting defaults on for
  migration compatibility and logs a warning until disabled after cutover.

## Local development

Use Python 3.12, Node.js 20, and a disposable/local PostgreSQL database.
Never put production credentials in a checked-in file.

1. From the repository root, copy the backend example environment:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to your local PostgreSQL database. The example uses the
   console email backend, which does not send email.

2. Apply migrations and start the backend in a PowerShell terminal:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --no-access-log --port 8000
   ```

3. In a second terminal, set up and start the frontend:

   ```powershell
   Set-Location ai-calling-frontend
   Copy-Item .env.example .env.local
   npm ci
   npm run dev
   ```

   Set `SESSION_COOKIE_SECRET` in `.env.local` to a random value of at least
   32 bytes before signing in. Open `http://localhost:3000`. Set
   `NEXT_PUBLIC_API_MODE=mock` in
   `.env.local` for preview fixtures; leave it as `live` to use the backend.

## Tests and CI

Use the repository's [CI workflow](./.github/workflows/ci.yml) for the
supported verification path:

- The backend job provisions PostgreSQL 16, applies all Alembic migrations,
  and runs `pytest`.
- The frontend job uses Node.js 20, installs from `package-lock.json` with
  `npm ci`, and runs `npm run build`. CI does not run a frontend test suite.

The backend test fixture drops and recreates its test schema. If running
backend tests locally, set `TEST_DATABASE_URL` to a separate, disposable
PostgreSQL database; never point it at development or production data.

## Documentation

- [Deployment runbook](./docs/DEPLOY_RUNBOOK.md) — EC2 deployment, migration
  preflight, provider cutover, validation, and rollback.
- [Sarvam setup](./docs/SARVAM_SETUP.md) — per-client integration setup and
  provider-console assumptions.
- [Phase changelog](./CHANGELOG_PHASES.md) — implementation and audit history.
- [Backend environment example](./.env.example)
- [Frontend environment example](./ai-calling-frontend/.env.example)
