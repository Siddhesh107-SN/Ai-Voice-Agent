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

# Phase 1.5 CI

## Change report

- Branch: `phase-1-syncfix`
- Base commit: `18280d903eac8d1611875474eddc3b854ab3ce3f`
- Commit: this report is included in the commit titled `Phase 1.5 CI`; its resulting hash is reported in chat.

### Files changed

- `.github/workflows/ci.yml` — adds push and pull-request CI jobs for backend startup, migrations, tests, and frontend production build.
- `CHANGELOG_PHASES.md` — records this CI setup and its verification limits.

No files were deleted or otherwise changed.

### Database and API

- Database changes: none.
- API changes: none.
- The backend workflow uses only a disposable PostgreSQL 16 service database. Both `DATABASE_URL` and `TEST_DATABASE_URL` point to that service; the test fixture is therefore isolated from any developer or production database.

### Workflow environment and behavior

- Backend CI sets `DATABASE_URL` and `TEST_DATABASE_URL` to the disposable service database URL and `JWT_SECRET_KEY` to a dummy test value. `tests/conftest.py` sets `APP_ENV`, rate limiting, and Sarvam webhook test settings itself.
- The startup command explicitly unsets `RESEND_API_KEY` and `MAIL_FROM` before importing the application.
- Frontend CI uses Node 20, `npm ci`, and `npm run build`, with `NEXT_PUBLIC_API_MODE=live`; no API key or GitHub secret is used.
- No GitHub secrets or repository settings need to be configured.
- No application behavior changes; this adds CI verification only.

### Verification

- The workflow YAML and commands were reviewed against `app/core/config.py`, `tests/conftest.py`, and the frontend lockfile.
- The workflow YAML parsed successfully with the existing Node.js YAML parser; both jobs and the trigger were present.
- CI itself has not yet run on GitHub in this session. The backend tests, migration against PostgreSQL, and CI-hosted startup check therefore remain unverified here.
- No application source, dependency manifest, or test file was changed.

# Phase 1.6 TESTFIX

## Change report

- Branch: `phase-1-6-testfix`
- Base commit: `fa88f28a6f772aea28c86a282a2bc3bc05d078f1`
- Commit: this report is included in the commit titled `Phase 1.6 TESTFIX`; its resulting hash is reported in chat.

### The 16 CI failures

| # | Test | Root cause | Changed side | File(s) changed |
|---|---|---|---|---|
| 1 | `test_admin_businesses_listing_and_pin_isolation` | `PinService` lacked the encryption method used to set up a PIN. | App code | `app/services/pin_service.py` |
| 2 | `test_admin_minute_pack_and_pin_operations` | PIN reset called a missing encrypt method and PIN view called a missing decrypt method. | App code | `app/services/pin_service.py` |
| 3 | `test_get_plans_public` | Per-test cleanup removed the global catalog and no fixture reseeded it. | Test fixture | `tests/conftest.py`, `tests/helpers.py` |
| 4 | `test_approve_and_decline_access_flow` | The approval flow requires the missing Growth plan row. | Test fixture | `tests/conftest.py`, `tests/helpers.py` |
| 5 | `test_manual_submit_payment_success` | Manual payment setup requires the missing plan catalog. | Test fixture | `tests/conftest.py`, `tests/helpers.py` |
| 6 | `test_manual_submit_payment_amount_mismatch_and_validations` | Plan rows were absent, and ordinary `AppError` responses use `error_code`, not `code`. | Test fixture and test | `tests/conftest.py`, `tests/helpers.py`, `tests/test_b3_features.py` |
| 7 | `test_onboarding_status_lifecycle_and_tenant_isolation` | The onboarding payment path requires the missing plan row. | Test fixture | `tests/conftest.py`, `tests/helpers.py` |
| 8 | `test_billing_me_success_and_alerts` | The test inserted calls without the model's required `phone_number`; valid webhook schema requires it. | Test | `tests/test_b2_features.py` |
| 9 | `test_billing_me_tenant_isolation` | The test inserted a call without the required `phone_number`; valid webhook schema requires it. | Test | `tests/test_b2_features.py` |
| 10 | `test_patch_business_rbac` | Test passed a display label instead of `client_staff` and treated the created-user response as login tokens. | Test | `tests/test_b2_features.py` |
| 11 | `test_manual_submit_payment_auth_and_roles` | Test read tokens from the created-user response and expected `code` instead of `error_code`. | Test | `tests/test_b3_features.py` |
| 12 | `test_get_business_bundle` | New-client default timezone was configured as UTC despite the expected Asia/Kolkata default. | App code | `app/core/config.py`, `.env.example` |
| 13 | `test_patch_business_atomic_replacement_and_audit_log` | The business audit details did not include `updated_fields`. | App code | `app/services/business_service.py` |
| 14 | `test_every_table_has_client_id` | The global `plans` catalog was incorrectly checked as tenant-owned data. | Test | `tests/test_multi_tenant_security.py` |
| 15 | `test_tenant_tables_have_client_id_index_or_fk` | The global `plans` catalog was incorrectly checked for a tenant FK. | Test | `tests/test_multi_tenant_security.py` |
| 16 | `test_every_api_route_requires_authentication_unless_allowlisted` | Logout intentionally revokes a refresh token from its body and does not require an access token. | Test | `tests/test_multi_tenant_security.py` |

### Files changed

- `app/services/pin_service.py` — adds `PinService.encrypt_pin` and `decrypt_pin`, using the existing Fernet scheme and configured key path.
- `app/core/config.py` — changes the default timezone for newly provisioned businesses to Asia/Kolkata.
- `.env.example` — aligns the documented `DEFAULT_TIMEZONE` with the application default.
- `app/services/business_service.py` — adds ordered `updated_fields` to audit details while retaining the existing `updated` key; lists only values that actually differ.
- `tests/helpers.py` — adds a shared idempotent plan-catalog seed helper with migration-equivalent values.
- `tests/conftest.py` — seeds the four global plans before each test and after cleanup truncates the test data.
- `tests/test_b2_features.py` — fixes the staff role/token assumptions, adds required call phone numbers, and updates timezone expectations.
- `tests/test_b3_features.py` — logs the created staff user in and checks the standard `error_code` field for ordinary API errors.
- `tests/test_calls.py` — updates the date-filter test to cover the new Asia/Kolkata default and a UTC override.
- `tests/test_multi_tenant_security.py` — excludes only the global plans catalog from tenant-table guards and allowlists unauthenticated logout.
- `CHANGELOG_PHASES.md` — records this phase and its diagnosis.

No files were created or deleted. No migration or CI workflow was changed.

### Database, API, and environment

- Database changes: none; no migration was added. Existing client rows are not updated.
- API changes: no route, request, or response contract changed. Working PIN reset/view is a bug fix.
- Environment changes: `DEFAULT_TIMEZONE`'s application and example default is now `Asia/Kolkata`. No CI environment variables or GitHub secrets were added; PIN encryption continues to use the existing configured key or the existing development/test fallback.
- Test plan seeding mirrors migration `0006`: Starter (2250/25200, 300 minutes), Growth (5700/66000, 1000), Business (14250/165000, 2500), and custom Enterprise (no fixed prices, 0 included minutes).
- Global table exclusion is exactly `GLOBAL_TABLES = {"plans"}`; no other table was silently excluded.

### User-visible behavior and verification

- Admin PIN reset and pin-view now use the same Fernet configuration and encryption scheme as PIN verification.
- Newly provisioned businesses default to `Asia/Kolkata`; existing businesses retain their stored timezone.
- Business-update audit details now retain `updated` and also include `updated_fields` in hours/services/staff order, limited to values that changed.
- As requested, pytest and database commands were not run locally. Only `python -m compileall app tests` was run as a syntax check; the CI suite remains to be verified after push.
- Remaining CI risk: tests could expose failures outside the 16 diagnoses or fixture-order assumptions that cannot be checked without running against the CI PostgreSQL service.
