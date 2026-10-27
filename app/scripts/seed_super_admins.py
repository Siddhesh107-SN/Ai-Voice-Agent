"""Idempotently seed permanent, protected Super Admin accounts from environment variables.

Environment variables required:
  SUPERADMIN_1_EMAIL, SUPERADMIN_1_PASSWORD
  SUPERADMIN_2_EMAIL, SUPERADMIN_2_PASSWORD

Usage:
  python -m app.scripts.seed_super_admins
"""
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.utils.validators import validate_password_strength


def seed_super_admins(db: Session | None = None) -> list[User]:
    """Read credentials from environment variables and create protected Super Admin accounts.
    
    Fails loudly if any environment variable is missing without creating partial accounts.
    Idempotent: skips accounts that already exist and never overwrites existing account data.
    """
    e1 = os.getenv("SUPERADMIN_1_EMAIL")
    p1 = os.getenv("SUPERADMIN_1_PASSWORD")
    e2 = os.getenv("SUPERADMIN_2_EMAIL")
    p2 = os.getenv("SUPERADMIN_2_PASSWORD")

    missing: list[str] = []
    if not e1 or not e1.strip():
        missing.append("SUPERADMIN_1_EMAIL")
    if not p1 or not p1.strip():
        missing.append("SUPERADMIN_1_PASSWORD")
    if not e2 or not e2.strip():
        missing.append("SUPERADMIN_2_EMAIL")
    if not p2 or not p2.strip():
        missing.append("SUPERADMIN_2_PASSWORD")

    if missing:
        raise ValueError(
            f"Missing required super admin environment variables: {', '.join(missing)}. "
            f"No accounts were created."
        )

    # Validate passwords before touching the database
    clean_p1 = validate_password_strength(p1.strip())
    clean_p2 = validate_password_strength(p2.strip())
    clean_e1 = e1.strip().lower()
    clean_e2 = e2.strip().lower()

    account_specs = [
        (clean_e1, clean_p1, "Sufiyan SuperAdmin"),
        (clean_e2, clean_p2, "Siddhesh SuperAdmin"),
    ]

    close_on_exit = False
    if db is None:
        db = SessionLocal()
        close_on_exit = True

    created_users: list[User] = []
    try:
        now = datetime.now(timezone.utc)
        for email, password, default_name in account_specs:
            existing = db.scalar(select(User).where(User.email == email))
            if existing is not None:
                # Safe to run on every deploy: must never overwrite an existing account's data
                continue

            user = User(
                client_id=None,
                name=default_name,
                email=email,
                password_hash=hash_password(password),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_protected=True,
                email_verified_at=now,
            )
            db.add(user)
            created_users.append(user)

        db.commit()
        for u in created_users:
            db.refresh(u)
        return created_users
    finally:
        if close_on_exit:
            db.close()


def main() -> None:
    try:
        created = seed_super_admins()
        print(f"Super admin seed complete. Provisioned {len(created)} new account(s).")
    except Exception as exc:
        print(f"Error seeding super admins: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
