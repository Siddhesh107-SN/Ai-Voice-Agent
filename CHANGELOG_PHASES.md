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

# Phase 1.7 TESTFIX2

## Change report

- Branch: `phase-1-6-testfix` (continued current branch; no branch created).
- Base commit: `9767eede85e04da31ebb6407abcb3ca37179426a`.
- Commit: this report is included in the commit titled `Phase 1.7 TESTFIX2`; its resulting hash is reported in chat.

### The 7 CI failures

| # | Test | Root cause | Changed side | File(s) changed |
|---|---|---|---|---|
| 1 | `test_admin_businesses_listing_and_pin_isolation` | `BillingService.get_billing_me()` returns a dictionary, but the admin list accessed it as an object; the intended response fields were otherwise correct. | App code | `app/services/admin_service.py` |
| 2 | `test_get_business_bundle` | `register_ok()` registers a business named `Biz`; the test expected a suffix that the helper and registration route never send. | Test | `tests/test_b2_features.py` |
| 3 | `test_manual_submit_payment_amount_mismatch_and_validations` | Duplicate transaction errors had a custom `detail`/`code` shape rather than the standard `success`/`message`/`error_code` body. The frontend accepts both code keys and displays the message, so the app response was standardized. | App code | `app/core/exceptions.py` |
| 4 | `test_onboarding_status_lifecycle_and_tenant_isolation` | The fixture transaction ID contained underscores and failed the alphanumeric validation before payment submission. | Test | `tests/test_b3_features.py` |
| 5 | `test_every_table_has_client_id` | `email_verifications` belongs to a user and has no direct `client_id`; the test incorrectly treated it as a tenant-owned table. | Test | `tests/test_multi_tenant_security.py` |
| 6 | `test_tenant_tables_have_client_id_index_or_fk` | The same user-scoped table is keyed through `user_id`, not `client_id`. The test now verifies its FK to `users`. | Test | `tests/test_multi_tenant_security.py` |
| 7 | `test_every_api_route_requires_authentication_unless_allowlisted` | Forgot-password is intentionally public and rate-limited; it was missing from the test allowlist. | Test | `tests/test_multi_tenant_security.py` |

### Files changed

- `app/services/admin_service.py` — indexes the billing dictionary fields, preserving the `AdminBusinessItem` response fields and values.
- `app/core/exceptions.py` — formats duplicate-transaction errors using the standard error body.
- `tests/test_b2_features.py` — expects the business name actually produced by `register_ok()`.
- `tests/test_b3_features.py` — uses a valid alphanumeric transaction reference and asserts the payment submission returned HTTP 200.
- `tests/test_multi_tenant_security.py` — identifies the user-scoped email-verification table, checks its `user_id` foreign key, and allowlists public forgot-password.
- `CHANGELOG_PHASES.md` — records this phase and its diagnosis.

No files were created or deleted. No other tables were excluded from the tenant-structure checks beyond the already documented global `plans` catalog and user-scoped `email_verifications`.

### Database, API, and environment

- Database changes: none; no migration, table, or column changes.
- Routes and request formats: unchanged.
- Response change: duplicate transaction errors now return HTTP 400 with `{"success": false, "message": "Transaction ID already submitted", "error_code": "TRANSACTION_DUPLICATE"}`. The frontend HTTP helper reads both `code` and `error_code` and displays the message, so it does not depend on the old custom shape.
- Environment/configuration changes: none.

### Forgot-password review and behavior

- `POST /api/v1/auth/forgot-password` is limited to 10 requests per minute per remote IP. It does not impose a per-email limit.
- For ordinary existing and nonexistent email addresses, it returns the same generic response. Protected accounts are rejected with HTTP 403 by `assert_user_not_protected`, which can reveal that a protected account exists.
- There is no password-reset token generation, storage (hashed or otherwise), expiry, single-use handling, or reset email in this flow. The response says instructions were sent, but this implementation only records an audit event for a found, non-protected user; it does not send an email.
- No public reset-password route exists. `/api/v1/admin/users/{user_id}/reset-password` is a separate super-admin-protected operation and was not allowlisted.
- Admin businesses continue to expose `plan`, `minutes_used`, `minutes_limit`, `status`, `renews_on`, `last_login`, and `has_pin` as before; dictionary access fixes the runtime error without changing the schema.

### Verification and remaining uncertainty

- `python -m compileall app tests` — passed (syntax check only).
- `pytest` and database commands were not run, as requested; all seven fixes still require confirmation in GitHub CI.
- No other matching billing method caller was found using object attributes; `BusinessService` already uses dictionary access.

# Phase 1.8 TESTFIX3

## Change report

- Branch: `phase-1-6-testfix` (continued; no branch created).
- Base commit: `509734ff4af3d95c3f431138a8f866a6a84fc344`.
- Commit: this report is included in the commit titled `Phase 1.8 TESTFIX3`; its resulting hash is reported in chat.

### Part A — complete guard inventory

All 23 mapped tables across `app/models` and all route modules under `app/api/routes` were inspected.

| Test | Every table/route that would fail | Resolution |
|---|---|---|
| `test_every_table_has_client_id` | `enquiries`: nullable `client_id`; `refresh_tokens`: no `client_id` column. | `enquiries` is explicitly documented in `NULLABLE_TENANT_TABLES` as a platform contact-form table. `refresh_tokens` is explicitly classified as user-scoped. |
| `test_tenant_tables_have_client_id_index_or_fk` | `refresh_tokens`: no `client_id` to reference; it is scoped through `user_id`. | Added it to `USER_SCOPED_TABLES` and verify each such table has a `user_id` foreign key to `users`. All other tenant tables have a client FK; `enquiries.client_id` has a direct client FK and a composite customer/client FK. |
| `test_every_api_route_requires_authentication_unless_allowlisted` | `GET /api/v1/plans` and `POST /api/v1/contact` were missing from `PUBLIC_ROUTES`. | Added both with a comment identifying their pre-authentication purpose. All remaining routes either require JWT authentication or use an already allowlisted public/provider-authenticated flow. |

Other table classifications: `clients` is the tenant root; `plans` is the existing global catalog; `email_verifications` is user-scoped. Other nullable `client_id` tables remain the documented `users`, `audit_logs`, `webhook_events`, and `call_attempts`. No other table was excluded or newly exempted.

The complete `PUBLIC_ROUTES` set now contains:

- `/api/v1/health` — public health/readiness endpoint.
- `/api/v1/auth/register` and `/api/v1/auth/login` — public account entry points.
- `/api/v1/auth/refresh` and `/api/v1/auth/logout` — authenticate through refresh-token request bodies.
- `/api/v1/auth/forgot-password` — public password-help request, rate-limited per IP.
- `/api/v1/plans` — public pricing/signup catalog.
- `/api/v1/contact` — public contact form, protected by a honeypot and a 5-per-hour IP limit.
- `/api/v1/webhooks/sarvam` — authenticated by Sarvam request signature.
- `/api/v1/webhooks/sarvam/{token}/outbound` and `/api/v1/webhooks/sarvam/{token}/{client_id}/appointments/{check-slot,book,reschedule,cancel}` — authenticated by the configured secret token in the URL.

### Part B — model and route findings

- `enquiries.client_id` is nullable and is explicitly set to `None` by the public contact submission path. The contact form does not provide a customer ID. For enquiries with a customer, the composite FK on `(client_id, customer_id)` ensures the referenced customer belongs to that same client; the separate FK also validates `client_id` against `clients`.
- Contact enquiries are read and updated through `/api/v1/admin/messages` and `/api/v1/admin/messages/{message_id}`, both requiring a `SuperAdminUser`. Tenant users therefore cannot read platform-level or other tenants' enquiries through these routes.
- `refresh_tokens` has no `client_id`; its non-null `user_id` is a foreign key to `users`. It is now checked as user-scoped rather than being assigned a new tenant column.
- `/api/v1/plans` returns `PlanOut`: catalog ID/key/name, public prices, included and max call minutes, and custom-plan status. It returns no internal costs or tenant-specific data.
- The other unallowlisted public route found during the full scan was `/api/v1/contact`; it is designed for anonymous contact submissions and is rate-limited with a honeypot. The remaining app routes require authenticated user dependencies, except the already allowlisted signature- or token-authenticated provider endpoints.

### Files, database, API, and behavior

- `tests/test_multi_tenant_security.py` — adds the documented user-scoped and nullable-table exceptions, validates `user_id` FKs for both user-scoped tables, and allowlists public plans/contact routes.
- `CHANGELOG_PHASES.md` — records this phase and its complete table/route analysis.
- No files were created or deleted.
- Database changes: none; no migration or schema change.
- API changes: none; no route or response contract changed.
- Environment/configuration changes: none.
- User-visible behavior changes: none.

### Verification and remaining uncertainty

- `python -m compileall app tests` — passed; syntax check only.
- `pytest` and database commands were not run, as requested. The three structural/auth tests and the CI suite still need execution in GitHub CI.
- The failure inventory is based on the current model metadata and registered route modules; CI remains the final confirmation that no test environment-specific issue is hidden behind these failures.

## Phase 2A LOGWATCH-API

### Change report

- Branch: `phase-2`; base commit: `f31c3b6536fc7a69db3d1e5434cbe5a4021e43e6`. This entry is included in the commit titled `Phase 2A LOGWATCH-API`; the exact commit hash is reported in the completion message.
- Database: added reversible Alembic migration `0010_logwatch_indexes_and_request_id.py`. It adds nullable `webhook_events.request_id` (`TEXT`) and conditionally creates indexes on `webhook_events(status, created_at)`, `webhook_events(client_id, created_at)`, and `audit_logs(action, created_at)`. Tool-call records reuse `audit_logs`; no new table is added. CI runs `alembic upgrade head`; test fixtures subsequently drop and recreate tables through SQLAlchemy `create_all`.
- Webhook processing now sets `processed_at`, status, and failure details on processed, failed, and duplicate outcomes; known-agent failures retain the agent's client ID, and an existing client ID in failure metadata may attribute an otherwise unknown-agent event. Duplicate deliveries still receive the same Sarvam response while the stored event is marked duplicate. The middleware's existing `X-Request-ID` response header behavior is unchanged; request IDs are stored on webhook events and tool audit details.
- Tool calls for `check-slot`, `book`, `reschedule`, and `cancel` now create best-effort `sarvam_tool.*` audit rows after token verification. Rows include URL client ID (including the requested ID in details for unknown clients), action, outcome, error code/message, appointment ID, duration, and request ID. A transaction-serialized per-minute cap applies per client and to a shared null-client bucket. Invalid/missing token attempts are bounded application logs only; they do not create audit rows. Tool responses are not changed if logging fails.
- New super-admin read APIs: `GET /api/v1/admin/webhook-events` (status, client, event-type, date filters; paginated); `GET /api/v1/admin/webhook-events/{id}` (same fields plus sanitized payload); `GET /api/v1/admin/tool-calls` (client, tool, success, date filters; paginated); `GET /api/v1/admin/appointments` (client, status, source, date filters; paginated); `GET /api/v1/admin/monitoring` (paginated cross-client operational/billing summary); and `GET /api/v1/admin/health/details` (database status, last webhook time, configuration-presence booleans, email backend name). All require `SuperAdminUser`.
- Tenant `GET /api/v1/appointments` accepts optional `order=asc|desc`; the default remains ascending and `desc` orders newest appointment date/time first. Its response shape is unchanged. The public `/api/v1/health` route is unchanged.
- Security: webhook detail payloads are recursively scrubbed of keys containing token, secret, password, authorization, api-key, or signature markers; phone-like values are masked to their last four digits, and configured secret values are redacted. Tool-call logs do not contain request bodies or phone numbers. No URL token is stored. Monitoring exposes only whether a provider agent ID exists, never its value.

### Files changed

- `app/api/routes/admin.py` — registered the six super-admin Logwatch routes with existing authentication and pagination patterns.
- `app/api/routes/appointments.py` — added the optional appointment ordering query parameter.
- `app/api/routes/sarvam_webhooks.py` — wrapped all four tool routes with best-effort audit logging and bounded invalid-token logs.
- `app/api/routes/webhooks.py` — passed middleware request IDs into webhook processing.
- `app/core/exceptions.py` — audited valid-token schema failures and bounded missing-token application logs without changing error responses.
- `app/models/audit_log.py` — declared the action/created-time index.
- `app/models/webhook_event.py` — added nullable request ID and webhook query indexes.
- `app/schemas/admin.py` — added response models for event, tool-call, appointment, monitoring, and health details.
- `app/services/admin_service.py` — implemented filtered, paginated Logwatch queries and monitoring/health summaries.
- `app/services/appointment_service.py` — added descending ordering while retaining the existing default.
- `app/services/billing_service.py` — added shared summary and batched, read-only billing calculations for monitoring, without changing existing billing calls.
- `app/services/tool_call_log_service.py` — added capped audit persistence, token-safe logging, recursive masking, and payload sanitization.
- `app/services/webhook_service.py` — recorded event completion state, failure attribution, duplicate status, and request IDs.
- `alembic/versions/0010_logwatch_indexes_and_request_id.py` — added the reversible request-ID column and conditional indexes.
- `tests/test_logwatch_api.py` — added endpoint authorization/filtering/redaction, monitoring scoping, tool logging/cap/failure, webhook outcome, and ordering tests.
- `CHANGELOG_PHASES.md` — documented Phase 2A implementation and operational notes.

### Tests, configuration, and remaining work

- Added tests: `test_all_logwatch_routes_enforce_super_admin_authentication` covers 401/403/200 role boundaries; `test_webhook_event_filters_pagination_and_detail_redaction`, `test_tool_call_filters_pagination_and_no_sensitive_data`, and `test_admin_appointments_filters_order_and_pagination` cover list filters/pagination and response contents; `test_monitoring_is_tenant_scoped_and_paginated` covers cross-tenant metrics; `test_health_details_exposes_presence_booleans_not_secret_values` covers configuration redaction; `test_tool_call_audit_records_success_failure_masking_and_request_id`, `test_invalid_tool_token_creates_no_audit_row`, `test_valid_tool_failures_are_capped_without_changing_response`, `test_valid_token_schema_validation_failure_is_audited`, `test_unknown_client_failure_uses_shared_null_tenant_log_bucket`, `test_unknown_client_tool_audits_share_the_cap`, and `test_tool_logging_failure_does_not_change_tool_response` cover tool logging and failure isolation; `test_webhook_events_capture_processing_outcomes_and_request_ids` covers webhook statuses/attribution/correlation; and `test_tenant_appointment_desc_order_is_opt_in` covers descending order plus the unchanged default.
- No dependencies or environment variables were added or changed. Plan prices, included minutes, and Sarvam response shapes/status codes are unchanged.
- Local `pytest`, database startup, and migration execution were not run as requested. `python -m compileall app tests` is the only local validation; GitHub CI remains responsible for migration and test execution.
- No frontend files were touched, and no push was performed.

## Phase 2B LOGWATCH-UI

### Change report

- Branch: `phase-2`; base commit: `9a7a5cc26f92deee9f8c46153f620e25baea62ed`. The implementation is committed as `Phase 2B LOGWATCH-UI`; the resulting commit hash is included in the delivery message.
- `ai-calling-frontend/src/features/dashboard/types.ts` — added typed webhook event, tool-call, all-client appointment, monitoring, health, and paginated result models matching the admin API fields.
- `ai-calling-frontend/src/features/dashboard/api.ts` — added six admin API adapters; retained pagination metadata, added nested payload sanitization, and added mock paging/filtering; live tenant appointment fetches now request `order=desc`.
- `ai-calling-frontend/src/lib/http.ts` — added opt-in envelope preservation for paginated admin responses; existing callers still unwrap responses by default.
- `ai-calling-frontend/src/features/dashboard/mock.ts` — added realistic sanitized logwatch samples, including unknown-agent and slot-conflict failures, near/over-limit clients, and enough list rows to exercise pagination.
- `ai-calling-frontend/src/features/dashboard/views-logwatch.tsx` — added the four role-guarded, lazy-fetch platform views, filters, pagination, retries/empty/error states, sanitized event detail modal, copy controls, health panel, and attention indicators.
- `ai-calling-frontend/src/features/dashboard/shell.tsx` — added four platform-only navigation links.
- `ai-calling-frontend/src/features/dashboard/dashboard.css` — added responsive horizontal table scrolling and styles for the new filters, health panel, modal payload, and attention rows.
- `ai-calling-frontend/src/app/dashboard/platform/monitoring/page.tsx` — registered the Monitoring screen under the platform route tree.
- `ai-calling-frontend/src/app/dashboard/platform/webhook-events/page.tsx` — registered the Webhook events screen under the platform route tree.
- `ai-calling-frontend/src/app/dashboard/platform/tool-calls/page.tsx` — registered the Tool calls screen under the platform route tree.
- `ai-calling-frontend/src/app/dashboard/platform/appointments/page.tsx` — registered the cross-client appointments screen under the platform route tree.
- `CHANGELOG_PHASES.md` — recorded the Phase 2B implementation, verification limitation, and mock-mode test steps.

### Database, API, and behavior

- Database changes: none. No backend file changed.
- New calls, made only when the corresponding screen opens: `GET /api/v1/admin/monitoring` and `GET /api/v1/admin/health/details` on Monitoring; `GET /api/v1/admin/webhook-events` on Webhook events and `GET /api/v1/admin/webhook-events/{id}` only when an event is opened; `GET /api/v1/admin/tool-calls` on Tool calls; `GET /api/v1/admin/appointments` on All appointments. Each list sends its supported filters plus `page` and `limit`. These calls are not added to dashboard initialization.
- Existing live appointment reads used by initial dashboard loading and polling now call `GET /api/v1/appointments?limit=100&order=desc`. Mock appointment behavior is unchanged. No other existing response shape changed.
- Platform navigation is shown only to the super-admin role; the existing platform route middleware remains in place, and the new views do not fetch or render data for other roles. API adapters also enforce the frontend role check outside mock mode.
- Payload display recursively removes keys containing `token`, `secret`, `password`, `authorization`, `api_key`, or `signature`, and masks phone-like values to their last four digits. No log records are stored in localStorage. Health displays configuration presence booleans and the email backend name, not configuration values.
- Environment variables and configuration: none added or changed. Mock behavior uses the existing `NEXT_PUBLIC_API_MODE=mock`.
- No new automated tests were added in this frontend phase.

### Build and manual mock checks

- Build command from `ai-calling-frontend`: `npm run build`. It could not complete because the local frontend dependencies are absent: `next` is not recognized as a command and `ai-calling-frontend/node_modules/.bin/next` does not exist. No packages were installed, as requested. `git diff --check` passed.
- Manual mock-mode check: in PowerShell, run `Set-Location C:\dev\talkaor-u2\ai-calling-frontend`, set `$env:NEXT_PUBLIC_API_MODE='mock'` and `$env:NEXT_PUBLIC_DASH_SIMULATE='1'`, then run `npm run dev`. In the super-admin dashboard use the new sidebar links or open `/dashboard/platform/monitoring`, `/dashboard/platform/webhook-events`, `/dashboard/platform/tool-calls`, and `/dashboard/platform/appointments`.
- Monitoring: verify all four client cards, especially Kale Wellness Studio near its limit and Patil Auto Care over its limit; check the health presence badges.
- Webhook events: filter status `failed`, client ID `2`, event type `call.completed`, and date `2026-10-24`; open the event row to inspect/copy the sanitized payload. Also clear the client filter and inspect the unknown-agent failure; try Next to exercise pagination.
- Tool calls: filter client ID `2` and outcome `Failure` to see the slot conflict; clear the client filter to see an unresolved-client failure. Copy a request ID and try Next.
- All appointments: filter client ID `2`, source `manual`, and date `2026-10-24` through `2026-10-30`; verify AI-agent/manual badges and newest-created ordering, then try Next.
- In the development role switcher, select Staff or Admin and confirm the platform links disappear and platform URLs redirect away. The build remains unverified until dependencies are available in CI or another configured environment.

## Phase 3A AGENTLINK-API

### Change report

- Branch: `phase-2`; base commit: `e50e90d052d89399287e4eb0020d3a0dbd87c621`. The implementation is committed as `Phase 3A AGENTLINK-API`; the resulting commit hash is included in the delivery message.
- `app/models/agent.py` — added the partial unique phone-number index; the nullable phone column and platform-wide `(provider, provider_agent_id)` uniqueness already existed.
- `app/models/client_tool_credential.py` — added the tenant-scoped credential model with hashed token and lifecycle timestamps.
- `app/models/__init__.py` — registered the credential model for metadata and schema creation.
- `alembic/versions/0011_agent_links_and_client_tool_credentials.py` — added the reversible credential table/indexes and phone-number uniqueness migration.
- `app/schemas/agent_link.py` — added super-admin agent-link, update, integration, and one-time token response schemas with E.164 validation.
- `app/schemas/admin.py` — added `phone_number` to the existing cross-client admin agent response.
- `app/core/config.py` — added `PUBLIC_API_BASE_URL` and `SARVAM_LEGACY_SHARED_TOKEN_ENABLED` settings.
- `.env.example` — documented the optional public API origin and the legacy-token cutover flag.
- `app/services/admin_agent_service.py` — implemented super-admin agent create/update/soft-unlink, conflict handling, and field-level audit records.
- `app/services/client_tool_credential_service.py` — implemented credential creation/rotation, integration details, token hashing, and best-effort last-used updates.
- `app/services/tool_call_log_service.py` — added bounded legacy-token warnings and capped audit logging integration.
- `app/services/admin_service.py` — included `phone_number` in the existing super-admin agent list.
- `app/api/routes/admin.py` — added super-admin-only agent-link, unlink, token, and integration endpoints.
- `app/api/routes/agents.py` — restricted tenant create/delete and non-status updates; retained tenant status toggles and tenant-scoped agent reads.
- `app/api/routes/sarvam_webhooks.py` — changed the four appointment tool routes to validate per-client credentials, with gated legacy-token compatibility and no token in audit/log messages.
- `tests/helpers.py` — added test helpers for super-admin agent creation and authentication.
- `tests/test_agentlink_api.py` — added tests for route authorization, linking and duplicate checks, tenant boundaries, credential rotation/scope, secret non-disclosure, and legacy compatibility.
- `tests/test_agents.py` — moved agent management assertions to super-admin endpoints and verified soft unlink and retained tenant power toggles.
- `tests/test_b1_features.py` — updated staff elevation assertions for the new restricted agent permissions.
- `tests/test_multi_tenant_security.py` — updated cross-tenant agent mutation expectations and asserted tenant creation is forbidden.
- `CHANGELOG_PHASES.md` — recorded this Phase 3A report.

### Database

- Migration: `0011_agent_links_and_client_tool_credentials.py`, following `0010`.
- `agents.phone_number` was already nullable in the existing schema, so no duplicate column was added. `(provider, provider_agent_id)` was already protected by the database-wide `uq_agents_provider_ref` constraint.
- Added partial unique index `uq_agents_phone_number` on non-null phone numbers.
- Added `client_tool_credentials`: `id`, non-null `client_id` FK, `token_hash`, `created_at`, `rotated_at`, `last_used_at`, and `revoked_at`; added the `client_id` index, unique token-hash constraint, and partial unique active-client index.
- Upgrade normalizes existing phone formatting and resolves duplicate phone assignments deterministically: the lowest agent ID retains the number and later duplicates are set to null before the unique index is created. Original values changed by this migration are stored temporarily in `agent_phone_number_migration_backup`; downgrade removes the new table/indexes and restores those original values where the phone field has not subsequently been changed. This prevents existing duplicate rows from blocking upgrade and preserves rollback data.
- The migration is reversible. No existing duplicate provider-agent IDs can block upgrade because the prior database constraint already enforced uniqueness.

### API and behavior

- `POST /api/v1/admin/clients/{client_id}/agents` — super admin only; accepts `name`, `provider`, `provider_agent_id`, `phone_number`, `description`, and `configuration`; returns the created `AgentOut` in the standard response envelope. Duplicate provider-agent IDs and phone numbers return 409 with `AGENT_ID_IN_USE` or `PHONE_IN_USE`.
- `PATCH /api/v1/admin/agents/{agent_id}` — super admin only; accepts `name`, `provider`, `provider_agent_id`, `phone_number`, and `status`; returns updated `AgentOut`.
- `POST /api/v1/admin/agents/{agent_id}/unlink` — super admin only; marks the agent inactive without deleting it.
- `POST /api/v1/admin/clients/{client_id}/tool-token` — super admin only; creates or rotates a credential, immediately revokes the prior one, and returns the raw token and four ready-to-use tool URLs once.
- `GET /api/v1/admin/clients/{client_id}/integration` — super admin only; returns the signed event webhook URL, four tool URL patterns using `{TOKEN}`, URL absoluteness, credential timestamps/existence, and linked agent IDs and phone numbers; it never returns a credential.
- `GET /api/v1/agents` and existing `GET /api/v1/admin/agents` — retain existing fields and now include `phone_number`; tenant responses remain tenant-scoped.
- Tenant `POST /api/v1/agents` and `DELETE /api/v1/agents/{agent_id}` are now forbidden. Tenant `PATCH /api/v1/agents/{agent_id}` accepts only `status`; attempts to modify name, provider, provider-agent ID, or phone return 403. The existing status/power toggle remains available.
- The four `POST /api/v1/webhooks/sarvam/{token}/{client_id}/appointments/{check-slot|book|reschedule|cancel}` routes now validate the token against that client’s active credential. Invalid or cross-client credentials retain the existing 404 response and create no audit rows. While the legacy flag is enabled, the shared token remains accepted with bounded warning/audit records; valid tool calls and failures continue through the existing capped audit logging. The signed event webhook and outbound webhook route were not changed.
- New agent and credential operations audit the acting super admin, client ID, and changed field names. Tokens are hashed at rest, compared with constant-time comparison, and excluded from logs/audit details; integration responses use only `{TOKEN}`.

### Configuration, tests, and remaining work

- `PUBLIC_API_BASE_URL` is optional. When unset, integration URLs are relative and `urls_are_absolute` is false. Set it to the public API origin if absolute tool/webhook URLs are required.
- `SARVAM_LEGACY_SHARED_TOKEN_ENABLED` defaults to `true` for compatibility. Keep it enabled during migration, then set it to `false` after every client uses an individual token. No real secrets were added or changed.
- New tests: `test_admin_agent_and_integration_routes_require_super_admin` (401/403/success authorization); `test_agent_phone_provider_uniqueness_and_validation` (normalization, invalid phone, and duplicate conflicts); `test_clients_only_read_agent_links_and_can_keep_status_toggle` (client/staff restrictions, power toggles, and tenant scoping); `test_client_tool_tokens_are_scoped_rotated_and_never_logged` (hashing, rotation, cross-client rejection, and no token leakage); `test_legacy_shared_token_flag_logs_without_token_and_can_be_disabled` (gated compatibility and audit/warning behavior).
- Verification: `python -m compileall app tests` is a syntax-only check. Pytest and database commands were not run as requested; CI must run the full suite and migration checks.
- No frontend files were changed. Existing dashboard calls `GET /api/v1/agents`, `GET /api/v1/admin/agents`, tenant `PATCH /api/v1/agents/{agent_id}` with only `status`, and super-admin `PATCH /api/v1/admin/agents/{agent_id}/power` remain compatible. Calls to tenant `POST /api/v1/agents`, `DELETE /api/v1/agents/{agent_id}`, or tenant PATCH with fields other than `status` now receive 403. No frontend agent-creation call was found during the prior review.
- Potential operational issue: existing duplicate phone assignments are deterministically cleared except for the lowest-ID agent during upgrade; the originals are preserved for downgrade. Review these reassigned agents after deployment if their phone links need manual correction.

## Phase 3B AGENTLINK-UI

### CHANGE REPORT

1. Branch: `phase-2`; base commit: `47ba8af08813af40c2cc5402bd1272c7ef193c5e`; new commit hash: reported in the delivery message. The commit hash cannot be embedded here because this report is part of that commit.
2. Files changed:
   - `ai-calling-frontend/src/features/dashboard/types.ts` — added client integration, one-time token, billing response, and extended agent types.
   - `ai-calling-frontend/src/features/dashboard/api.ts` — added role-checked agent-link/integration/token/billing adapters, mock behavior, error mapping, and admin API guards.
   - `ai-calling-frontend/src/features/dashboard/mock.ts` — added Sarvam agent metadata and mock client integration data.
   - `ai-calling-frontend/src/features/dashboard/ui.tsx` — added reusable clipboard feedback and configurable billing progress bar.
   - `ai-calling-frontend/src/features/dashboard/views-platform.tsx` — extended the existing platform Agents view with client integration, link/edit/unlink, and one-time token workflows.
   - `ai-calling-frontend/src/features/dashboard/views-tenant.tsx` — shows assigned phone numbers and billing credit; removes tenant agent create/configure controls.
   - `ai-calling-frontend/src/features/dashboard/shell.tsx` — blocks tenant access to platform routes and hides role switching outside mock mode.
   - `CHANGELOG_PHASES.md` — recorded this Phase 3B report.
   - No files were created or deleted.
3. Database changes: none.
4. API calls:
   - `GET /api/v1/admin/agents` — loads the platform agent list; client integration data is fetched to fill in provider agent ID, status, and token-exists fields absent from the existing list response.
   - `GET /api/v1/admin/clients/{client_id}/integration` — enriches agent rows and opens a client’s integration view.
   - `POST /api/v1/admin/clients/{client_id}/agents` — links a Sarvam agent and E.164 phone number.
   - `PATCH /api/v1/admin/agents/{agent_id}` — edits the linked agent name, provider agent ID, and phone.
   - `POST /api/v1/admin/agents/{agent_id}/unlink` — deactivates an agent without deleting it.
   - `POST /api/v1/admin/clients/{client_id}/tool-token` — generates or rotates the client token; its response is shown once and is not persisted.
   - `GET /api/v1/billing/me` — loads the signed-in client’s plan, minutes, alert, and renewal date.
   - Existing `GET /api/v1/agents` remains the tenant list call. Tenant power changes continue through `PATCH /api/v1/agents/{agent_id}` with only `{ "status": "active" | "inactive" }`; super-admin power changes continue through `PATCH /api/v1/admin/agents/{agent_id}/power`.
   - Tenant agent creation/deletion and non-status edits are not called. No backend file changed.
5. Environment/configuration changes: none.
6. Behavior by role:
   - Super admin: can link/edit/unlink Sarvam agents, copy phone numbers and integration URLs, and generate/rotate a client tool token. Rotation warns that the prior token stops working. Raw tokens and ready URLs exist only in the one-time view’s component state.
   - Client admin: sees their assigned number/status and billing credit; can toggle agent power and cannot create, delete, or edit agent configuration. The prior minute-pack button was removed because it invoked a super-admin-only API.
   - Client staff: sees the assigned number/status and billing credit; agent management controls for create/delete/edit are absent. Existing admin-session requirements for power changes remain.
7. Build: not run; `ai-calling-frontend/node_modules` is absent. Dependencies were not installed, as requested.
8. Assumptions and remaining items:
   - The backend schemas provide every billing field used by the UI. The existing admin agent list omits provider agent ID and status, so the UI obtains these from the per-client integration response.
   - The seeded mock billing sample is 62% used (normal state); warning and limit styling follows the response `alert` and `usage_percent` values.
   - Exact mock-mode manual checks:
     1. In PowerShell, run `Set-Location C:\dev\talkaor-u2\ai-calling-frontend`, `$env:NEXT_PUBLIC_API_MODE='mock'`, then `npm run dev` when dependencies are available. Sign in, then use the mock role switcher to choose Super Admin.
     2. Open **AI agents (all)**. Link an agent to a client with a unique provider ID and phone such as `+919876543210`. Try provider ID `sarvam-sunrise-aria` and phone `+912040001101` to verify the duplicate messages; enter an invalid phone to verify inline E.164 validation.
     3. Edit the new agent and confirm the name, provider ID, and phone update. Choose **Unlink**, verify the confirmation says it deactivates rather than deletes, then confirm the row remains with inactive status.
     4. Open a client’s **Integration** view. Verify the relative-URL hint, signed event URL, four `{TOKEN}` patterns, credential status/timestamps, linked agent IDs/phones, copy buttons, and the legacy shared-token note.
     5. Generate a token and confirm the warning. Copy the token and all four ready URLs, close the modal, reopen Integration, and verify the raw token is not shown again. Rotate it and verify the new one-time modal and warning.
     6. Switch to Client Admin, open **AI Voice Agents**, verify the assigned number and copy button, the customer-call explanation, and the active status. Verify there are no Add, Configure, Edit, or Unlink controls; test the power toggle.
     7. On the client dashboard, verify the Growth plan, `114 of 300 minutes left`, renewal date, normal progress color, and rounded-up-minute note. Switch to Staff and verify the same read-only phone and billing details.
     8. In non-mock/live mode, verify the role switcher is absent for clients and directly opening a `/dashboard/platform/...` route shows the access-denied state and redirects.

## Phase 4A SARVAMFIT

### Change report

- Branch: `phase-2`; base commit: `356127636303a70edb0de27400640fae911038ce`. Commit: this report is included in `Phase 4A SARVAMFIT`; the new hash is reported in the delivery message.
- Files changed:
  - `.env.example` — documents `OVERAGE_GRACE_PERCENT`, defaulting to 10.
  - `app/api/routes/sarvam_webhooks.py` — adds header-authenticated tool and call-completion routes, call-start gate route, and preserves existing path-token and signed-webhook routes.
  - `app/core/config.py` — adds the overage grace setting.
  - `app/integrations/sarvam/schemas.py` — adds a lenient call-completion payload schema; unknown fields are ignored and an interaction or attempt ID is required.
  - `app/schemas/agent_link.py` — extends integration and one-time-token responses with header-based tool, call-completed, and call-start URL/header fields.
  - `app/services/client_tool_credential_service.py` — builds the new relative or absolute integration/setup URLs without persisting or logging raw tokens.
  - `app/services/sarvam_call_service.py` — adds sanitized, idempotent call processing and the fail-open service gate.
  - `app/services/tool_call_log_service.py` — adds capped warning audit records for unlinked agents and denied call starts.
  - `tests/test_agentlink_api.py` — verifies the additional integration and one-time setup fields.
  - `tests/test_multi_tenant_security.py` — allowlists the new token-authenticated public routes in the existing route-structure test.
  - `tests/test_sarvam_call_completed.py` — covers authentication/scope, idempotency, payload redaction, call mapping, billing, and ignored/unlinked cases.
  - `tests/test_sarvam_call_start.py` — covers plan grace, suspension/inactivity, header authentication, audit, and fail-open behavior.
  - `tests/test_sarvam_public_webhooks.py` — covers header/Bearer tool authentication, tenant isolation, legacy-token rejection, and validation-failure auditing.
  - `CHANGELOG_PHASES.md` — records this phase and its setup/verification notes.
  - No files were deleted.

### Database and API

- Database changes: none. Existing `calls`, `webhook_events`, and `audit_logs` tables are reused; no migration was added.
- `POST /api/v1/webhooks/sarvam/{token}/{client_id}/call-completed` accepts a client token in the path. The path token takes precedence; this new route accepts only per-client credentials and does not accept the legacy shared token.
- `POST /api/v1/webhooks/sarvam/{client_id}/call-completed` accepts the per-client token in `X-Webhook-Token` or `Authorization: Bearer ...`; it also rejects the legacy shared token. Invalid credentials retain the existing 404 behavior and create no rows. Unusable payloads return HTTP 200 with `status: ignored`; successful and repeated deliveries return `processed` and `duplicate`.
- The lenient callback schema accepts `app_id`, `interaction_id`, `attempt_id`, caller/dialed number fields, duration, completion/connectivity statuses, timestamps, transcript, variables, and metadata. Unknown fields—including any undeclared event type or recording URL—are ignored. `interaction_id` is the call's provider ID when present; `event_id` uses the interaction ID or, otherwise, attempt ID.
- Calls are resolved only inside the authenticated client, first by provider agent ID and then by agent phone. Inbound/outbound direction and caller phone are mapped from the payload. Positive connected durations are rounded up to whole seconds and stored as billable completed calls. Failed or unconnected calls retain a non-completed status and null duration. Payloads stored in `webhook_events` are passed through the existing Phase 2A sanitizer. An unlinked agent does not prevent call storage and generates a capped warning audit entry containing its `app_id`.
- Header-only `POST /api/v1/webhooks/sarvam/{client_id}/appointments/{check-slot|book|reschedule|cancel}` routes accept `X-Tool-Token` or Bearer credentials, are client-scoped, and reject the legacy shared token. Existing token-in-path appointment routes retain their prior behavior, including the configured legacy-token transition.
- `POST /api/v1/webhooks/sarvam/{client_id}/call-start` accepts `X-Tool-Token` or Bearer credentials and returns `service_active`, `reason`, `business_name`, `plan`, and `minutes_remaining`. It uses `BillingService`'s current-period plan allowance and minute packs, blocks suspended/inactive clients and usage at or above the configured grace threshold, and returns `reason: ok` if an unexpected gate error occurs. Denials are audit-logged under the existing per-client cap; this endpoint does not create a call row.
- New call-completed and call-start routes are limited to 30 requests per minute per IP; new header-based tool routes are limited to 60 per minute per IP.
- `GET /api/v1/admin/clients/{client_id}/integration` now includes header-based tool URL patterns, call-completed path-token and header URL patterns, the call-completed/header names, and call-start URL/header fields. `POST /api/v1/admin/clients/{client_id}/tool-token` now returns both header-tool URLs and ready-to-use call-completed/call-start setup URLs and header names with the raw token. Existing super-admin authorization is unchanged.
- The signed `POST /api/v1/webhooks/sarvam` route and its HMAC behavior were not changed. No Sarvam provider calls were made.

### Configuration, tests, and remaining work

- `OVERAGE_GRACE_PERCENT` defaults to 10; the gate blocks at 110% of included minutes plus current-period minute packs. `PUBLIC_API_BASE_URL` continues to control whether setup URLs are absolute; no secret values were added.
- Setup: configure `PUBLIC_API_BASE_URL` to the public API origin, generate a per-client token from the super-admin token endpoint, and copy it directly into Sarvam. Use the header-tool URLs with `X-Tool-Token`; configure call-completed with either the one-time token-path URL or the header URL plus `X-Webhook-Token`. The call-start URL accepts `X-Tool-Token`. Once all clients have individual credentials, disable the legacy shared token on the server.
- `python -m compileall app tests` passed. `git diff --check` passed. Pytest, database, Docker, and Alembic commands were not run; tests were added for CI.
- No dependencies or frontend files changed.
- Payload assumptions: `attempt_id` identifies outbound calls; callbacks with neither a usable caller number nor interaction/attempt ID are ignored. Both `from_number`/`to_number` and common caller/dialed aliases are accepted. `recording_url` is deliberately not inferred from the payload. The existing database has a global `(provider, event_id)` unique constraint; cross-tenant collisions are safely ignored rather than altering another tenant's webhook event.

## Phase 4B MINUTECUT-UI

### Change report

- Branch: `phase-2`; base commit: `63c40278470318333c42ee8ea8206a8b0a9284c0`. Commit message: `Phase 4B MINUTECUT-UI`; the resulting hash is reported in the delivery message.
- Files changed:
  - `.gitignore` — ignores `.vscode/`.
  - `.vscode/settings.json` — was tracked; removed from the Git index as requested and retained locally.
  - `docs/SARVAM_SETUP.md` — adds placeholder-only Sarvam configuration, testing, legacy-token retirement, and troubleshooting steps, with console limitations noted.
  - `ai-calling-frontend/src/features/dashboard/api.ts` — consumes the additive admin/billing data, removes per-client Integration fetches from the platform agent list, and adds mock billing states.
  - `ai-calling-frontend/src/features/dashboard/mock.ts` — adds Phase 4A URL/header samples and monitoring signals for mock mode.
  - `ai-calling-frontend/src/features/dashboard/types.ts` — models integration setup URLs/headers, billing pause fields, and monitoring indicators.
  - `ai-calling-frontend/src/features/dashboard/views-logwatch.tsx` — displays blocked-call and legacy-token indicators.
  - `ai-calling-frontend/src/features/dashboard/views-platform.tsx` — displays header-based tool, call-completed, and call-start setup details and one-time URLs.
  - `ai-calling-frontend/src/features/dashboard/views-tenant.tsx` — shows the assigned phone and status, places plan/credit information on the client dashboard, and renders each billing state.
  - `app/schemas/admin.py` — adds agent-list and monitoring response fields.
  - `app/schemas/billing.py` — adds `calls_paused` and `pause_at_percent` to the billing response.
  - `app/services/admin_service.py` — populates agent token presence and batched monitoring audit aggregates.
  - `app/services/billing_service.py` — shares the call-start decision logic and returns the additive pause fields.
  - `app/services/sarvam_call_service.py` — uses the shared call-start decision helper.
  - `tests/test_agentlink_api.py` — tests agent-list additions and client-scoped credential presence.
  - `tests/test_b2_features.py` — tests billing pause thresholds, old billing fields, and tenant scoping.
  - `tests/test_logwatch_api.py` — tests the 24-hour blocked-call and 7-day legacy-token aggregates.

### Database, API, and configuration

- Database changes: none. No migrations or schema changes.
- `GET /api/v1/admin/agents` adds `provider_agent_id`, `status`, and `tool_token_exists`; `phone_number` was already returned and remains available. All existing response fields are unchanged. The token-presence lookup is batched, and the platform list no longer makes per-client Integration calls.
- `GET /api/v1/billing/me` adds `calls_paused` and `pause_at_percent`; existing response fields are unchanged. `calls_paused` reuses the call-start gate decision and is true only for the over-limit pause reason.
- `GET /api/v1/admin/monitoring` adds `blocked_calls_24h` and `legacy_token_in_use`; existing response fields are unchanged. Aggregates are grouped by client in one query for the current page.
- No routes were added or changed. The frontend now consumes the Phase 4A `GET /api/v1/admin/clients/{client_id}/integration` URL/header fields and the corresponding `POST /api/v1/admin/clients/{client_id}/tool-token` response fields. Those existing response shapes are unchanged.
- Public Sarvam route rate limits were checked and already exist: both call-completed variants and call-start are limited to 30 requests/minute/IP; each of the four header-based tool routes is limited to 60 requests/minute/IP. The existing signed webhook remains limited to 120 requests/minute/IP. No rate-limit change was necessary.
- Environment variables and other configuration: unchanged. No dependencies were added. `.vscode/` was tracked before this change and is now ignored.

### Role behavior, tests, and remaining work

- Super admin: Agent links show provider agent ID, status, phone, and token presence from the agent-list endpoint. Integration displays the Phase 4A URLs, headers, token metadata, copy controls, and legacy-token help; token material remains component state and appears only in the one-time modal.
- Client admin and staff: Dashboard shows the assigned phone/status and billing minutes/pause state. Agent creation/deletion/editing remains unavailable to clients; the existing power toggle sends only `{status}`. Super-admin adapters continue to reject client roles.
- Mock mode: includes normal, 80% warning, 100% limit, and paused billing samples, selectable from the dashboard billing card. Integration URL and header samples remain relative.
- The billing API exposes the existing `plan` key (for example, `growth`) but does not expose a separate display-name field; the dashboard displays the returned value rather than inventing a plan name.
- Tests added or extended: `test_admin_agent_list_includes_link_fields_and_client_token_presence`, `test_billing_me_success_and_alerts`, `test_billing_pause_fields_are_scoped_to_the_signed_in_tenant`, and `test_monitoring_adds_blocked_call_and_legacy_token_aggregates`.
- Verification: Python AST parsing passed for all eight modified Python files; `git diff --check` passed. Pytest, database commands, npm install, and frontend build were not run as requested; build and tests remain for CI.
- The Sarvam console steps are documented with placeholders only. Exact console controls, secret-reference syntax, and response-to-variable mapping depend on Sarvam behavior that this repository cannot verify.

## Phase 4C DEMOCLEAN

### CHANGE REPORT

1. Branch: `phase-2`; base commit: `9bb9fe128a1e8738a830b7989f55c509fc39db62`. The new commit hash is in the delivery summary because this changelog entry is part of that commit.
2. Demo surface inventory:
   - `ai-calling-frontend/src/middleware.ts:10-27` — previously accepted `?role=` and `NEXT_PUBLIC_DASH_SIMULATE` to select/bypass roles. Removed both; live dashboard role routing now uses the auth-set role cookie, and mock mode alone bypasses login for previews.
   - `ai-calling-frontend/src/lib/http.ts:67-105` — the authenticated user role was persisted inside `tk_user` in localStorage. `getUserRole()` now reads the auth-set role cookie, and login clears the old localStorage value so localStorage cannot switch the live UI/API role.
   - `ai-calling-frontend/src/app/dashboard/layout.tsx:11-14` — previously used `NEXT_PUBLIC_DASH_SIMULATE` to suppress appointment polling. It now follows `NEXT_PUBLIC_API_MODE=mock`.
   - `ai-calling-frontend/src/features/dashboard/shell.tsx:16-18, 174-202, 294, 327-337` — role selectors and fixture identities remain available only in mock mode; client roles get a compact assigned-number block in either mode. The online indicator, exact-number copy, extra-number link, and unassigned/error states are live-safe.
   - `ai-calling-frontend/src/features/dashboard/views-tenant.tsx:137, 261` — mock billing-state selector remains mock-only; fake Call/WhatsApp toast buttons are now mock-only and are absent in live mode.
   - `ai-calling-frontend/src/features/dashboard/views-tenant.tsx:165-214` — dashboard previously displayed fixed `342` calls, `128` customers, and a hardcoded weekly chart. Live mode now derives counts from loaded records and does not render the mock chart.
   - `ai-calling-frontend/src/features/dashboard/views-platform.tsx:33-60` — platform revenue history used hardcoded monthly values; those are now mock-only, and live mode shows no invented history.
   - `ai-calling-frontend/src/features/dashboard/appointments.tsx:34-40` — the fabricated customer contact fallback is now used only in mock mode; live booking requires an existing customer.
   - `ai-calling-frontend/src/components/talkaor-flow/PaymentView.tsx:82` — the `test@talkaor.com` fallback was removed; it was not displayed, but could be passed as payment state.
   - `ai-calling-frontend/src/lib/server/session.ts:18-22` and `src/features/dashboard/store.tsx:99-108` — sample profile emails/names were removed from the live fallback state.
   - `ai-calling-frontend/src/features/dashboard/mock.ts:16, 85, 135-176` — sample dashboard, webhook, and tool-call records remain mock fixtures; adapters load them only when mock mode is enabled. They are not live-request fallbacks.
   - `ai-calling-frontend/src/components/TryIt.tsx:7-56`, `src/data/scenes.ts:97,124`, `src/app/(marketing)/page.tsx:7,22` — the public interactive product demo and its sample scenarios are visible in live marketing mode and are intentionally retained; they do not sign in or link to a demo dashboard.
   - `ai-calling-frontend/src/components/WhoFor.tsx:89-93` and `src/app/globals.css:266-267` — the marketing `demo-line` animation is visible live but is only a styling class, not demo data or a role control.
   - `ai-calling-frontend/src/app/onboarding-status/preview/page.tsx:7-104` and `src/components/onboarding-status/StatusView.tsx:123` — sample status scenarios are dev-preview-only; the preview route returns not-found in production.
   - `ai-calling-frontend/src/components/AuthForm.tsx:6,24` — legacy form includes a demo success message but has no imports/usages in the app, so it is not visible in login/signup or live routes.
   - `ai-calling-frontend/.env.example:11-12` — legacy `NEXT_PUBLIC_DASH_SIMULATE` entry is retained but marked ignored. The live LoginView and SignupView have no sample credentials, demo-account shortcuts, or demo links; no demo password was found.
3. Files changed:
   - `.env.example` — marked `NEXT_PUBLIC_DASH_SIMULATE` as ignored and documented mock mode as the preview switch.
   - `src/app/dashboard/layout.tsx` — ties appointment polling simulation to mock mode and uses a generic business label.
   - `src/middleware.ts` — removes query-role selection and the development simulation bypass.
   - `src/features/dashboard/shell.tsx` — mock-gates both role selectors; adds the compact client phone/status/copy block and visible dashboard-load error/retry.
   - `src/features/dashboard/store.tsx` — prevents role mutation outside mock mode and exposes initial/polling data failures instead of silently hiding them.
   - `src/features/dashboard/api.ts` — lets a failed business-data request reach the dashboard error state instead of converting it to a successful empty fallback.
   - `src/features/dashboard/views-tenant.tsx` — hides fake customer actions outside mock mode, removes sample-name fallback and fixed live metrics, and suppresses the mock weekly chart in live mode.
   - `src/features/dashboard/views-platform.tsx` — hides invented historical revenue values outside mock mode.
   - `src/features/dashboard/appointments.tsx` — limits fake customer contact data to mock mode.
   - `src/lib/server/session.ts` — removes a hardcoded sample email from the dashboard profile.
   - `src/lib/http.ts` — removes persisted role data from localStorage and sources `getUserRole()` from the auth-set cookie.
   - `src/components/talkaor-flow/PaymentView.tsx` — removes the fallback test email.
   - `CHANGELOG_PHASES.md` — records this phase and its demo-surface inventory.
   - No files were created or deleted.
4. Database/API changes: none. No backend file changed. No dependencies were added. Failed live dashboard loads now show an error and retry control; live failures do not fall back to mock data. The live call response/model has no call timestamp for a truthful weekly calls chart, so live mode explains that gap instead of drawing fixture data.
5. No runtime environment variables were added or changed. `NEXT_PUBLIC_DASH_SIMULATE` is no longer read by source code; it remains in `.env.example` only as a documented ignored legacy entry. `NEXT_PUBLIC_API_MODE=mock` remains the mock switch. The frontend does not persist role or phone data in localStorage/sessionStorage; the existing authenticated role cookie remains the role source.
6. Behavior:
   - Live super admin: no role-switching control; the existing platform role label and route/API guards remain.
   - Live client admin/staff: no role switcher; shell shows the first assigned phone number, readable formatting, exact E.164 copy, online/offline state, and `+N more` when applicable. Missing numbers show the assignment hint; failed loads show an error instead.
   - Mock mode: role switchers and fixture data remain; client admin/staff also see the number block. Fake customer action toasts and billing preview remain mock-only.
7. Verification: no build, npm, or tests were run as requested. `git diff --check` passed.
8. Manual checks: in live mode, sign in as each role; confirm no role selector, verify each client’s number/copy/status/more link or unassigned hint, try `?role=super_admin` and confirm it does not change role, and open a platform URL as a client to confirm redirect/denial. Simulate an API failure and confirm the error/retry state appears without fixtures. In mock mode (`NEXT_PUBLIC_API_MODE=mock`), verify the switcher remains usable for each role, client number block appears, and `NEXT_PUBLIC_DASH_SIMULATE` has no effect. No backend behavior or API endpoints were changed. The existing Next.js route guard still relies on the client-readable `tk_role` cookie set after authentication; backend APIs remain authoritative. A server-verified/HttpOnly session would require auth/backend work outside this frontend-only scope.
## Phase 5 FINALCHECK

### Audit summary

- **Migrations:** Revisions `0001`–`0011` form a single linear chain with `0011`
  as the static head. `0010` has an unguarded `request_id` column addition;
  `0011` creates objects without existence guards and automatically nulls
  later agents with duplicate digit-normalized phone numbers. Downgrades are
  not uniformly lossless; `0005` conditionally adds columns but its downgrade
  drops them unconditionally, `0011` removes client tool credentials, and
  `0008` can fail when public enquiries have a NULL `client_id`.
- **Configuration:** Backend settings and direct environment reads are
  documented in `.env.example`; frontend settings are in
  `ai-calling-frontend/.env.example`. Production startup validates the JWT
  secret length/prefix and presence of the PIN encryption key, but not every
  operational setting. `EMAIL_BACKEND=console` does not deliver email.
- **Public routes:** Public APIs include health, auth entry points, plans,
  contact, and Sarvam callbacks/tools. Rate limits exist on several routes,
  but path-token tool callbacks and the shared-token outbound callback have
  no explicit per-route limit. Contact and callback endpoints can create
  rows; their caps differ by route.
- **Tenant isolation:** Authenticated tenant access generally scopes by the
  token-derived client ID. Public contact enquiries intentionally have
  `client_id = NULL` and are visible to super-admin message views, not tenant
  users. Refresh tokens and email-verification records are user-scoped.
- **Billing:** Plans include 300, 1,000, and 2,500 minutes; minute packs add to
  the current period, and each completed `Call` is rounded up to whole
  minutes. Call-start gating uses `OVERAGE_GRACE_PERCENT`, but the gate fails
  open on selected errors/missing client data and does not reserve concurrent
  usage. `CallAttempt` is not included in the billed-minute sum.
- **Sarvam:** Per-client completion callbacks create/update the billed `Call`
  record and webhook event; admin Monitoring and Webhook events consume these
  records. Payload fields, identifier stability, response mapping, retry
  behavior, and provider header support remain assumptions to verify in the
  Sarvam console. The legacy signed webhook and shared-token outbound route
  are not disabled by `SARVAM_LEGACY_SHARED_TOKEN_ENABLED=false`. The legacy
  webhook stores the raw provider payload; review/redact fields before retaining
  it if the provider can include credentials or unnecessary personal data.
- **Email/OTP:** The frontend uses database-backed authenticated
  `/auth/verify-email/*`; root-mounted in-memory `/auth/send-otp` and
  `/auth/verify-otp` remain legacy flows. Keep the database-backed flow and
  retire the unused OTP flow after confirming no external clients depend on
  it. A console backend sends no email, and a missing Resend key prevents
  delivery.
- **Frontend/API:** The initial dashboard fetch requests tenant-only business
  and appointment endpoints even for super-admin, producing a dashboard-load
  failure. Call list/detail schemas include `started_at` and `duration`, but
  the frontend adapter omits `started_at`; a weekly chart can use the existing
  API data after frontend wiring. Forgot-password links to a missing
  frontend page and the backend does not implement a reset-email flow.
- **Session/security:** The middleware and server dashboard layout trust
  editable `tk_role` and `tk_session_user` cookies for UI routing; backend APIs
  still enforce bearer-token roles. Auth/elevation tokens are stored in
  localStorage. Gunicorn access paths can contain legacy URL tokens. The
  super-admin PIN view/reset responses return PINs; replace with a non-
  disclosure reset/credential workflow.
- **Repository/security:** Git history contains sensitive-file names
  (`.env`, `.env.local`, `.vscode/settings.json`, and
  `ai-calling-frontend/backend/talkaor.db`); contents were not inspected.
  Rotate any real credentials that may have been committed and remove
  sensitive history through the repository's approved process. CORS is
  origin-configured, but production must use exact trusted origins. The
  development console email backend logs verification codes; keep it out of
  production and avoid collecting development logs. `APP_ENV=production`
  does not force `DEBUG=false`; a misconfigured production instance can expose
  debug tracebacks.
- **Coverage/dead code:** CI runs backend pytest against PostgreSQL 16 and
  applies migrations; the frontend gets a production build only, with no
  frontend test suite. Legacy OTP components/routes, unused `AuthForm.tsx`,
  root duplicate API mounts, `NEXT_PUBLIC_DASH_SIMULATE` documentation, and
  the unused landing-page copy merit removal or explicit compatibility
  decisions. Current frontend has a business/appointment role mismatch.

### Documentation and verification

- Added `docs/DEPLOY_RUNBOOK.md` with process-manager alternatives, production
  environment placeholders, migration preflight, Sarvam cutover, checks, and
  rollback cautions.
- Reworked `README.md` for architecture, local setup, CI coverage, and docs.
- No application code, tests, migrations, workflows, or dependencies were
  changed. No tests, database, Docker, npm install, or frontend build were run.

### Security follow-up

- Added migration `0012` for hashed one-time password-reset codes and an
  `auth_version` counter. Reset codes expire, are attempt-limited and
  single-use; successful resets revoke refresh tokens and invalidate existing
  access tokens. The forgot-password response does not reveal account
  eligibility, and email delivery runs after the response.
- Replaced the PIN reveal endpoint and PIN-bearing responses with a reset-only
  interface. Added per-IP rate limits to the root OTP routes, path-token
  Sarvam tools, and the shared-token outbound callback.
- Removed request targets from Gunicorn access logs, suppresses verification
  codes from console logs, and rejects `DEBUG=true` in production.
- Added a server-verified dashboard session cookie, with the signing secret
  documented in the frontend environment example. Existing browser tokens
  remain in localStorage as requested.
- Added the frontend password-reset flow and backend tests for public
  responses, cross-user isolation, one-time code use, password changes, and
  session invalidation.
- No PostgreSQL-dependent tests, migrations, Docker commands, dependency
  installs, or frontend builds were run in this follow-up.
- The production warning and legacy-token flag now also cover the shared-token
  Sarvam `/outbound` callback. Gunicorn access logs omit request paths; direct
  Uvicorn deployments must use `--no-access-log`, and Nginx must be configured
  to omit token-bearing request targets.
- Path-token and header-token Sarvam appointment routes now share undecorated
  operation helpers and each apply their own 60/minute limit; this avoids
  directly calling a SlowAPI-wrapped route handler from the header variant.
- Super-admin initial loads now fetch platform-only data and skip tenant
  appointment polling. Updated the runbook with secret-rotation guidance and
  clarified the changed `SARVAM_LEGACY_SHARED_TOKEN_ENABLED` behavior.
