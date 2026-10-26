# Backend Development Rules

- **Stack**: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL.
- **Migrations**: Never edit migrations 0001 to 0004. Each prompt adds exactly one new migration (0005, 0006, ...).
- **File Organization**: Put new code in NEW files where possible, following the existing patterns (routers registered in the v1 router, dependencies in `dependencies.py`, repositories and services). Do not move or rename existing files.
- **Multi-Tenancy & Scoping**: Every query is tenant-scoped with `client_id` taken from the verified token, never from the request body.
- **Security & Privacy**: Never log or return secrets, PINs, password hashes or tokens. Audit-log entries must never contain a PIN.
- **API Response Format**: Responses are plain FastAPI JSON (no `{ok, data}` envelope). Errors use `{"detail": "...", "code": "..."}` where a code is named.
- **Testing**: Add pytest tests for every new endpoint (success, not signed in, wrong role, other tenant). If tests need Postgres or Docker that cannot be run, still write them and state clearly that they were not run. Do not install packages or run docker, alembic, or the database unless requested. If a new dependency is needed, add it to `requirements.txt` and inform the user.
- **Behavior Changes**: When an existing endpoint must change behaviour, list it in the reply before editing and keep the change minimal.
