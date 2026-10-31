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
