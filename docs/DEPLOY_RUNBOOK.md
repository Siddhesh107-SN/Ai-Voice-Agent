# EC2 deployment runbook

This runbook assumes the EC2 server already hosts the FastAPI backend, the
Next.js frontend, and a PostgreSQL database. Use the process manager already
installed on that server; do not introduce a second deployment mechanism.
Replace every `<...>` value with the server's real configuration, and never
paste credentials or tokens into source control, tickets, or shell history.

For Sarvam console setup details, use [SARVAM_SETUP.md](./SARVAM_SETUP.md).

## Before deployment

1. **Back up the production database first.** Confirm the backup is stored
   outside the repository with access restricted to the operations team, and
   that the restore procedure is known. With `DATABASE_URL` already set in the
   shell's protected environment:

   ```bash
   pg_dump "$DATABASE_URL" --format=custom --file="<secure-backup-path>/pre-phase5.dump"
   ```

2. Record the currently deployed Git commit hash and the intended rollback
   hash. Confirm the deployment branch and remote, and that the working tree
   contains only the release being deployed.
3. Schedule a maintenance window away from live calls. Confirm no call is in
   progress and tell operators when the API and dashboard may restart.
4. Confirm PostgreSQL is reachable, disk space is sufficient for the backup
   and build, the production environment file is backed up securely, and the
   frontend and backend process names/commands are known.
5. Review the migration preflight below, especially if revisions `0010` and
   `0011` are pending. Do not rely on migration-side cleanup as a substitute
   for resolving unexpected production data.

## Production environment

Use the example files as the source of the complete setting inventory:
[`../.env.example`](../.env.example) and
[`../ai-calling-frontend/.env.example`](../ai-calling-frontend/.env.example).
Update the existing server environment/secret manager; do not replace it with
a checked-in `.env`.

Backend settings required or strongly recommended for production:

```dotenv
APP_ENV=production
DEBUG=false
DATABASE_URL=postgresql+psycopg2://<db-user>:<url-encoded-password>@<db-host>:5432/<db-name>
JWT_SECRET_KEY=<random-secret-at-least-32-characters>
PIN_ENCRYPTION_KEY=<valid-Fernet-key-from-the-secret-manager>
CORS_ORIGINS=https://<frontend-domain>
RATE_LIMIT_ENABLED=true
TRUSTED_PROXY_COUNT=1
DOCS_ENABLED=false
PUBLIC_API_BASE_URL=https://<api-domain>
DEFAULT_TIMEZONE=<IANA-timezone>
EMAIL_BACKEND=resend
RESEND_API_KEY=<Resend-secret-from-the-secret-manager>
MAIL_FROM=Talkaor <no-reply@<verified-domain>>
REQUIRE_EMAIL_VERIFICATION=true
SARVAM_WEBHOOK_SECRET=<random-secret-from-the-secret-manager>
SARVAM_LEGACY_SHARED_TOKEN_ENABLED=false
OVERAGE_GRACE_PERCENT=10
```

`APP_ENV=production` requires `DEBUG=false`, validates that `JWT_SECRET_KEY`
is at least 32 characters and does not use the development `change-me` prefix,
and requires `PIN_ENCRYPTION_KEY`. The PIN key must also be a valid Fernet key
when PIN encryption is used. Keep all key values in the server's secret
manager/environment, not in this file or deployment logs. Configure
`SARVAM_API_KEY`, `SARVAM_BASE_URL`, and `SARVAM_WEBHOOK_SECRET` only as needed
for the enabled Sarvam paths; the legacy signature secret does not replace
per-client tool tokens. Keep the existing shared-token setting during a
staggered client migration; set `SARVAM_LEGACY_SHARED_TOKEN_ENABLED=false`
only after every client has completed the cutover below. For email delivery,
use either a configured Resend backend or SMTP (`SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` as required by the server).

Generate high-entropy secrets with a trusted local Python installation and
transfer them directly into the secret manager (do not put them in shell
history, Git, or deployment logs):

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

For `PIN_ENCRYPTION_KEY`, generate a Fernet-compatible key instead:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Production pre-flight checklist

Review these values before starting the backend/frontend. The app does not
validate every URL or provider integration at startup, so a process can start
while a deployment is still unusable.

| Setting | Required value / safe example | If missing or wrong |
|---|---|---|
| `APP_ENV` | `production` | Defaults to development if omitted; production protections/validation and production docs behavior may not apply. |
| `DEBUG` | `false` | `true` with production `APP_ENV` fails backend settings validation and prevents app startup. |
| `DATABASE_URL` | Valid PostgreSQL URL from the secret manager | Database startup/queries and health checks fail; ensure URL-encode special characters in credentials. |
| `JWT_SECRET_KEY` | Unique random secret, at least 32 characters; generate with the `secrets.token_urlsafe(48)` example above | Weak/default secret under production fails settings validation/startup; changing it invalidates issued JWTs. |
| `PIN_ENCRYPTION_KEY` | Valid Fernet key; use the Fernet generator above | Missing key fails production settings validation/startup; malformed key can make PIN operations fail. Rotating it requires re-encryption or PIN resets. |
| `SESSION_COOKIE_SECRET` (frontend) | Random high-entropy value of at least 32 bytes, same on every frontend instance | Missing/short secret makes the Next.js session route return 503 when login/signup tries to create the dashboard session. |
| `BACKEND_INTERNAL_URL` | Backend-reachable URL, e.g. `http://127.0.0.1:8000` on a shared host | If absent, the frontend falls back to `NEXT_PUBLIC_API_URL`; if both are missing/unreachable, session verification fails and dashboard login cannot complete. |
| `EMAIL_BACKEND` | `resend` or `smtp` | `console` warns in production and does not send mail; email verification/password reset return 503 when delivery is unavailable. |
| Email credentials | Resend requires `RESEND_API_KEY` and `MAIL_FROM`; SMTP requires `SMTP_HOST`, `EMAIL_FROM`, and any server-required `SMTP_USER`/`SMTP_PASSWORD` | Missing sender/host/key prevents delivery configuration; SMTP auth/network errors prevent email delivery. |
| `CORS_ORIGINS` | Exact browser origin(s), e.g. `https://<frontend-domain>` | Wrong/missing origin does not stop app startup but browser API requests fail CORS checks. Avoid wildcards with credentialed requests. |
| `PUBLIC_API_BASE_URL` | Public HTTPS API origin, e.g. `https://<api-domain>` | App can start, but generated Sarvam URLs may be relative and integration setup warns; provider callbacks may not reach the API. |
| Frontend base URL for reset email | Public frontend origin, e.g. `https://<frontend-domain>` | **No backend setting currently generates a reset URL.** Reset mail contains a one-time code only; users must open the deployed frontend's `/forgot-password` page and enter it. There is no `FRONTEND_BASE_URL` variable consumed by the application today. |
| `SARVAM_WEBHOOK_SECRET` | Secret-manager value matching the configured legacy signed webhook/shared outbound integration | App can start, but signed `/api/v1/webhooks/sarvam` requests and shared-token outbound requests fail authentication without the matching secret. Per-client token routes are separate. |
| `SARVAM_LEGACY_SHARED_TOKEN_ENABLED` | `false` after all clients and outbound callbacks are cut over; transitional default is `true` | `true` leaves compatibility enabled and emits a production startup warning; setting false too early rejects callers still using the shared token. |
| `RATE_LIMIT_ENABLED` | `true` | `false` disables SlowAPI rate limits; app still starts but public endpoints lose this protection. |
| `TRUSTED_PROXY_COUNT` | Exact number of trusted forwarding proxies; `1` for a single Nginx proxy immediately before the app | Default `0` preserves the existing `request.client.host` key behavior. Uvicorn's proxy-header middleware can rewrite that ASGI peer value when its immediate peer is trusted, so use a positive count with the configured proxy chain to select from raw `X-Forwarded-For`. An incorrect count can group callers under a proxy IP or trust an attacker-controlled entry; setting it above the actual trusted chain lets callers spoof their rate-limit IP. Restrict direct backend access to the trusted proxy. |
| `OVERAGE_GRACE_PERCENT` | Intended billing grace percentage, normally `10` | App can start with an incorrect value; call-start gating may block billable calls too early or allow calls beyond the intended allowance. |

### Nginx forwarded client IP

For a single Nginx reverse proxy on the EC2 host, forward the connection
peer address and append it to any incoming forwarding chain. Do **not** use
the raw leftmost `X-Forwarded-For` value as the client's identity: external
callers can send that header themselves.

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Set `TRUSTED_PROXY_COUNT=1` only when this Nginx instance is the only trusted
proxy between the caller and the app. The limiter selects the address at
`X-Forwarded-For` position `proxy_count` from the right, so a single Nginx
uses the rightmost appended peer address. For a multi-proxy chain, count the
trusted proxy hops and ensure each proxy appends its observed peer address.
Setting the count above the actual number of trusted proxies can select a
caller-forged value and let callers evade per-IP rate limits. Keep Gunicorn/
Uvicorn inaccessible directly from untrusted networks; only Nginx should be
able to connect to the backend port.

The current limiter's zero-count behavior remains `slowapi`'s
`get_remote_address`, which reads `request.client.host`. The configured
`UvicornWorker` has proxy-header handling enabled by default, with no explicit
`forwarded_allow_ips` override in this repository. Therefore, when Nginx
connects over a trusted loopback address, Uvicorn may already rewrite the
ASGI peer address from the leftmost forwarded value. `TRUSTED_PROXY_COUNT=0`
does not disable that Uvicorn behavior or necessarily mean the kernel-level
socket peer. Set the count to the actual proxy count and use the Nginx
append-header configuration above to make the limiter select the intended
client from the unmodified header chain.

Frontend environment:

```dotenv
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=https://<api-domain>
NEXT_PUBLIC_ONBOARDING_STATUS_URL=/api/v1/onboarding/status
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
SESSION_COOKIE_SECRET=<random-secret-at-least-32-bytes>
```

For a Compose network, set `BACKEND_INTERNAL_URL` to the backend service name
and port instead (for example `http://<backend-service>:8000`). Never deploy
with mock mode enabled.

`SESSION_COOKIE_SECRET` must be a high-entropy secret of at least 32 bytes.
Keep it stable across frontend restarts and instances so existing sessions
remain valid.

`SARVAM_LEGACY_SHARED_TOKEN_ENABLED` defaults to `true` for compatibility and
produces a production startup warning while enabled. It gates the shared-token
fallback for legacy tool paths and the `/outbound` callback. Set it to `false`
only after each client has been moved to per-client credentials and the
outbound callback no longer needs the shared token.

Both path-token and header-token appointment tool routes are limited to
60 requests per minute per source IP. The legacy outbound callback is limited
to 30 per minute, as are the call-start and call-completed callbacks.

### Access-log handling

The production Gunicorn configuration logs client address, HTTP method,
status, and latency, but deliberately omits the request target. If a service
runs Uvicorn directly, start it with `--no-access-log`; Uvicorn's default
access log includes the request path. The server owner must also configure
Nginx not to log token-bearing Sarvam paths: disable access logging for those
locations or use a custom format that omits `$request`, `$request_uri`, and
`$uri`. Check proxy and error-log formats as well; do not assume application
logging settings control Nginx.

## Rotate secrets

If this repository was public or shared outside the trusted operations team,
rotate any credential that was ever committed or exposed through logs, even
if the corresponding file is no longer present. The historical `.env` and
`.env.local` entries were frontend configuration names, and
`.vscode/settings.json` contained an editor setting; the historical
`ai-calling-frontend/backend/talkaor.db` contained populated user, customer,
appointment, call, and audit tables. Treat the database contents as exposed
user data and follow the organization's incident-response and notification
policy.

Review and rotate, as applicable:

- `DATABASE_URL` credentials; update the database role password and the
  protected server environment.
- `JWT_SECRET_KEY`; this invalidates signed access, refresh, and elevation
  tokens, so require users to sign in again.
- `SESSION_COOKIE_SECRET`; this invalidates signed dashboard session cookies.
- `PIN_ENCRYPTION_KEY`; coordinate a secure re-encryption of stored PINs or
  reset them before replacing the key, since old encrypted PINs cannot be
  decrypted with a new key.
- `SUPERADMIN_1_PASSWORD` and `SUPERADMIN_2_PASSWORD`; update through the
  approved account-management process.
- `RESEND_API_KEY`, SMTP credentials (`SMTP_USER`/`SMTP_PASSWORD`), and any
  `SARVAM_API_KEY` or `SARVAM_WEBHOOK_SECRET` that may have been exposed.
- Per-client Sarvam tool tokens; revoke and reissue them in the integration
  screen, then update the matching provider configuration.

Do not put replacement values in Git, deployment output, tickets, or shell
history. Use the approved secret manager and verify service health after each
rotation.

## Migration preflight: revisions 0010, 0011, and 0012

Revision `0010` unconditionally adds `webhook_events.request_id`. If that
column already exists, the migration fails. It conditionally skips its three
indexes when an index with the same name or column set is present; inspect
whether any pre-existing index is actually equivalent before upgrading.

Revision `0011` creates a phone-number backup table, a partial unique agent
phone index, and client tool credential tables/indexes without existence
guards. Existing objects with those names can make it fail. It normalizes
formatting and identifies duplicate phone numbers by digits; later duplicate
agents are set to `NULL` by the migration. Resolve duplicates deliberately
before deployment to avoid losing an agent's configured number.

Revision `0012` adds `users.auth_version` with a zero default and creates
`password_reset_codes` plus two indexes. It does not rewrite existing user
rows beyond the defaulted version column. The table, column, and indexes are
created without existence guards; if any already exist, stop and inspect the
schema rather than applying the migration blindly.

Run these checks using a read-only production database session before
`alembic upgrade head`:

```sql
-- Collisions according to 0011's digits-only duplicate check.
WITH normalized AS (
    SELECT id, phone_number,
           regexp_replace(phone_number, '[^0-9]', '', 'g') AS phone_digits
    FROM agents
    WHERE phone_number IS NOT NULL
)
SELECT phone_digits,
       count(*) AS row_count,
       array_agg(id ORDER BY id) AS agent_ids,
       array_agg(phone_number ORDER BY id) AS stored_numbers
FROM normalized
GROUP BY phone_digits
HAVING count(*) > 1;

-- 0010 must not find request_id already present.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'webhook_events'
  AND column_name = 'request_id';

-- 0011 objects must not already exist unless this database is being repaired
-- with a reviewed, migration-specific procedure.
SELECT to_regclass('public.agent_phone_number_migration_backup') AS phone_backup_table,
       to_regclass('public.client_tool_credentials') AS tool_credentials_table,
       to_regclass('public.uq_agents_phone_number') AS agent_phone_index,
       to_regclass('public.ix_client_tool_credentials_client_id') AS credential_client_index,
       to_regclass('public.uq_client_tool_credentials_active_client') AS active_credential_index;

-- 0010 index names; verify any result is structurally equivalent.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND indexname IN (
      'ix_webhook_events_status_created_at',
      'ix_webhook_events_client_created_at',
      'ix_audit_logs_action_created_at'
  );

-- 0012 objects must not already exist before applying the migration.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'users'
  AND column_name = 'auth_version';

SELECT to_regclass('public.password_reset_codes') AS reset_code_table,
       to_regclass('public.ix_password_reset_codes_user_id') AS reset_user_index,
       to_regclass('public.ix_password_reset_codes_user_created') AS reset_user_created_index;
```

If a check returns unexpected results, stop and prepare a reviewed database
repair plan; do not manually mark a migration as applied.

## Deployment order

1. Merge the reviewed release into the server's deployment branch. Preserve
   the old commit hash for rollback.
2. On EC2, fetch and fast-forward the intended branch:

   ```bash
   cd <repository-directory>
   git fetch origin
   git checkout <deployment-branch>
   git pull --ff-only origin <deployment-branch>
   git rev-parse HEAD
   ```

   Record the resulting hash. Confirm it is the intended release.
3. With the new code checked out and the preflight complete, apply migrations
   **before restarting either application**:

   ```bash
   alembic upgrade head
   ```

   For a containerized backend, run the same migration against the existing
   service environment before rebuilding or restarting application services:

   ```bash
   docker compose run --rm <backend-service> alembic upgrade head
   ```

   Confirm that this one-off service uses the same production database
   configuration as the deployed backend. Do not rebuild or restart the
   frontend before the migration succeeds.
4. Restart the backend using the existing manager:

   **systemd**

   ```bash
   sudo systemctl restart <backend-unit>
   sudo systemctl status <backend-unit> --no-pager
   ```

   **PM2**

   ```bash
   pm2 restart <backend-process>
   pm2 status
   ```

   **Docker Compose**

   ```bash
   docker compose up -d --build <backend-service>
   docker compose ps
   ```

5. Build and restart the frontend:

   **systemd or PM2 on the host**

   ```bash
   cd <repository-directory>/ai-calling-frontend
   npm ci
   npm run build
   ```

   Then restart its existing unit/process (`sudo systemctl restart
   <frontend-unit>` or `pm2 restart <frontend-process>`) and confirm it is
   active.

   **Docker Compose**

   ```bash
   cd <repository-directory>
   docker compose up -d --build <frontend-service>
   docker compose ps
   ```

6. Keep the maintenance window open until the post-deploy checks pass.

## Per-client Sarvam cutover

Complete this sequence for each client while the current integration remains
available. Use [SARVAM_SETUP.md](./SARVAM_SETUP.md) for console-specific
instructions and placeholders.

1. In the client's Integration screen, create/rotate the client tool token.
   Store the one-time token in Sarvam's supported secret store; do not put it
   in an agent prompt, URL, source file, or ticket.
2. Update the four tool URLs (check-slot, book, reschedule, cancel) in Sarvam
   to their header-based variants and configure the displayed
   `X-Tool-Token` header or the documented supported bearer-header variant.
3. Set the call-completed webhook to the client's header-based URL and
   configure its displayed `X-Webhook-Token` header.
4. Set the on-start/call-start hook to the client's URL and configure
   `X-Tool-Token`. Map the `service_active` response according to the current
   Sarvam console facilities.
5. Place a test call. Verify the event in **Webhook events**, the requests in
   **Tool calls**, and the client's usage/status in **Monitoring**.
6. Repeat for every client. Only after all clients have moved, set
   `SARVAM_LEGACY_SHARED_TOKEN_ENABLED=false` and restart the backend if
   required by the process manager.

That flag disables the shared-token fallback for legacy path-token tool
routes and the shared-token outbound callback
`/api/v1/webhooks/sarvam/{token}/outbound`. It does **not** disable the old
signed `/api/v1/webhooks/sarvam` endpoint. If that signed endpoint is no
longer used, block it at the reverse proxy/firewall or remove it in a
separately reviewed code release. Redact token-bearing request paths from
proxy access and error logs.

## Post-deploy checks

1. Check the public health endpoint without displaying environment values:

   ```bash
   curl --fail --silent --show-error https://<api-domain>/api/v1/health
   ```

2. Sign in through the browser as a super-admin. Confirm the **Monitoring**
   screen loads and lists current clients.
3. Open Monitoring's health details and confirm database health, expected
   provider/email configuration presence indicators, and production mode.
   These indicators report whether settings are set, not their values.
4. Check **Webhook events** and **Tool calls** after the Sarvam test call. Verify
   the intended client, successful processing, and no unexpected legacy-token
   use. Do not copy raw tokens or sensitive payloads into deployment output.
5. Sign in as a tenant admin and confirm the tenant dashboard loads. Verify
   one normal appointment, call-list, and billing view where the data exists.
6. With a dedicated test account and working email delivery, verify the
   password-reset code flow and confirm that the previous session is rejected.

## Rollback

Prefer a forward fix when possible. A database backup restore is a separate
high-impact operation: coordinate downtime, preserve the current database for
investigation, and restore only after confirming the backup and point-in-time
impact.

For an application-only rollback, check out the recorded old commit and
rebuild/restart backend and frontend using the same process manager. First
confirm the old application is compatible with the upgraded schema; do not
assume a code rollback also rolls back the database.

If a reviewed database rollback is required and the current head is `0012`,
roll back to a specific reviewed revision, one step at a time:

```bash
alembic downgrade 0011
alembic downgrade 0010
alembic downgrade 0009
```

The first command downgrades `0012`; the second downgrades `0011`; the third
downgrades `0010`. Revision `0012` permanently deletes reset-code records and
drops `users.auth_version`. Downgrading that counter can make still-unexpired
access tokens from before a password reset usable again under the old code.
Roll back the application first, revoke affected sessions if needed, and
confirm the impact with the security owner before downgrading.

Revision `0011` drops the client tool credential table and its tokens, removes the
unique phone index, restores original agent phone strings from its backup
table, and then drops that backup table. Credential records are not restored;
re-upgrading requires token re-provisioning. Do not downgrade if the backup
table is absent or if the production phone state has changed unexpectedly.
Revision `0010` drops `request_id` data and drops its named indexes, including
an index it did not create if it happens to share a migration's expected name.
Revision `0008` also has a known downgrade hazard: public enquiries with a
NULL `client_id` prevent restoring the old NOT NULL constraint. Preserve the
backup and obtain database-owner approval before any downgrade.

## Troubleshooting

| Symptom | Checks and response |
|---|---|
| `/api/v1/health` fails | Check backend service state, reverse-proxy upstream, port, and backend logs. Do not paste environment values into logs or tickets. |
| Migration fails on an existing column, table, or index | Stop deployment; compare the production schema with the preflight SQL and review the migration state before making changes. |
| Migration reports agent phone uniqueness | Review the digits-only duplicate query, resolve ownership/number assignment with the client, back up the table, then retry under the approved migration procedure. |
| Frontend returns 502 or API requests fail | Confirm the frontend rewrite's `BACKEND_INTERNAL_URL`, backend health, reverse-proxy routing, and that frontend/backend processes use the intended environment. |
| Verification email cannot arrive | Confirm `EMAIL_BACKEND` is a real delivery backend and its credentials/sender are configured. `console` does not send email; production requests return 503 when delivery is not configured. |
| Password-reset request returns 503 | Confirm SMTP or Resend is selected and its required settings are present; console delivery is not accepted for password resets. |
| Dashboard redirects to login after successful authentication | Confirm `SESSION_COOKIE_SECRET` is set to the same stable secret for every frontend instance and that `BACKEND_INTERNAL_URL` can reach the backend `/api/v1/auth/me` endpoint. |
| Sarvam webhook is missing | Check the configured URL and authentication header in Sarvam, the public API origin, and **Webhook events**. Provider delivery and retry behavior must be confirmed in Sarvam. |
| Tool call is unauthorized | Rotate or verify the client tool token and compare the configured header name and URL with that client's Integration screen. Avoid tokens in URL paths. |
| Call is blocked or not billed | Check Monitoring's client status and usage, then inspect the call-start response, call-completed event, recognized phone number, and duration. The provider's response handling must be verified in Sarvam. |
