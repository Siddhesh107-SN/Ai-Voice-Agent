# Phase 1 SYNCFIX

## Baseline

- Branch: `phase-1-syncfix`
- Base commit: `506cdb8744bd2b5ede28d8a712df28b77e181bed`
- Commit: this report is included in the commit titled `Phase 1 SYNCFIX`; the resulting hash is reported in chat.

## Files changed

- `.env.example` — documents backend settings, mail providers, Gunicorn, super-admin provisioning, and the isolated test database variable.
- `README.md` — adds local backend/frontend startup steps and warns that backend tests drop and recreate their database schema.
- `ai-calling-frontend/.env.example` — documents live/mock mode and frontend backend URL variables.
- `ai-calling-frontend/README.md` — replaces obsolete mock-switch instructions with `NEXT_PUBLIC_API_MODE`.
- `app/otp_service.py` — defers Resend configuration reads until an OTP send is requested and raises a specific missing-key error.
- `app/otp_routes.py` — maps missing OTP Resend configuration to HTTP 503.
- `app/services/email_service.py` — adds a production-console configuration warning helper.
- `app/main.py` — invokes the warning helper at application startup.
- `ai-calling-frontend/src/features/dashboard/api.ts` — corrects minute-pack and approval response types, validates appointment customer IDs, and adds call-detail fetching.
- `ai-calling-frontend/src/features/dashboard/views-tenant.tsx` — refreshes call details when opened, instead of relying on list fields for recordings/transcripts.

No files were deleted. `ai-calling-frontend/next.config.mjs` was already using `http://127.0.0.1:8000` as its fallback and was left unchanged.

## Database and API

- No migrations, tables, or columns changed.
- No backend route paths were added, removed, or changed. The existing `/auth/send-otp` route now returns HTTP 503 when `RESEND_API_KEY` is missing.
- The frontend now calls the existing `GET /api/v1/calls/{id}` endpoint when a call-detail view is opened.
- Minute-pack and access-approval results are treated as action responses; existing callers reload dashboard data so updated values appear.
- Live appointment creation no longer substitutes customer ID `1`; invalid or missing IDs produce a user-visible validation error.
- Appointment ordering remains unchanged: the backend accepts no sort/order parameter and returns appointments in ascending date/time order, while the dashboard fetches at most 100. Newer appointments can therefore be omitted.

## Configuration and behavior

- The root environment example documents the variables read by backend settings, the super-admin seeder, tests, and Gunicorn. The frontend example documents its public API/mode variables and server-side backend URL.
- Configure a local PostgreSQL `DATABASE_URL`, apply migrations, then start `uvicorn` on port 8000. Resend credentials are not required to import/start the app; requests to the standalone OTP send route need `RESEND_API_KEY`.
- In production, `EMAIL_BACKEND=console` now emits a startup warning and still does not send email. Defaults were not changed.
- Minute-pack results are refreshed after the action; approval refreshes both the access request and business data. Call details display loading/error states, recording links when available, and transcript text from the detail response.
- A valid live appointment requires a positive safe-integer customer ID. Existing mock appointment behavior remains unchanged.

## Verification

- `npm install` in `ai-calling-frontend/` — succeeded. npm reported 6 dependency audit findings (1 moderate, 4 high, 1 critical); dependencies were not updated.
- `npm run build` in `ai-calling-frontend/` — succeeded; Next.js compiled, lint/type checks completed, and static pages generated.
- `git diff --check` — passed.
- Python AST syntax check for the modified backend files — passed.
- `python -m pip install -r requirements.txt` — could not complete: only Python 3.14 is installed, and the pinned `psycopg2-binary` package attempted a source build that requires unavailable `pg_config`.
- `python -c "import app.main"` — not verified successfully; it stopped with `ModuleNotFoundError: No module named 'jose'` after the requirements installation failure. `RESEND_API_KEY` and `MAIL_FROM` were unset, and no root `.env` file was present during the check.
- Backend tests were skipped because `TEST_DATABASE_URL` is unset and no separate empty PostgreSQL test database is configured.

## Manual checks

1. With Python 3.12 and dependencies installed, unset `RESEND_API_KEY` and `MAIL_FROM`, then run `python -c "import app.main"` from the repository root; the app should import. Posting to `/auth/send-otp` without the key should return HTTP 503.
2. Start the backend and frontend using the root `README.md`; sign in with an existing provisioned account.
3. In a tenant with a customer, create an appointment and confirm it appears. In a tenant with no appointment/customer available, submit the new-appointment form and confirm the invalid-customer message is shown rather than sending customer ID `1`.
4. Cancel the appointment, then create or select another active appointment, reschedule it, and confirm both changes after the dashboard refreshes.
5. As a super admin, add a minute pack and confirm the business minutes refresh.
6. As a super admin, approve a pending access request and confirm the request and business status refresh.
7. Open a call's details and confirm the browser requests `GET /api/v1/calls/{id}` and displays the returned transcript/recording when available.

## OTP flow distinction

- The existing database-backed flow is `/api/v1/auth/verify-email/send` and `/api/v1/auth/verify-email/confirm`; it is separate from the new OTP module and remains unchanged.
- The standalone `/auth/send-otp` and `/auth/verify-otp` flow uses a six-digit code, an in-memory hashed-code store, a 10-minute expiry, a 60-second resend cooldown, and a five-attempt limit. Its verification handler still has a TODO instead of marking the user verified in the database, and `OtpStep.tsx` is not wired into signup. It calls Resend directly and does not use `EMAIL_BACKEND`.
