"""Idempotently seed permanent, protected Super Admin accounts from environment variables.

Environment variables required:
  SUPERADMIN_1_EMAIL, SUPERADMIN_1_PASSWORD
  SUPERADMIN_2_EMAIL, SUPERADMIN_2_PASSWORD

Optional environment variable:
  SUPERADMIN_SYNC_PASSWORDS=true (updates passwords for existing accounts to match env vars)

Usage:
  python -m app.scripts.seed_super_admins
  python -m app.scripts.seed_super_admins --force-sync-passwords
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.utils.validators import validate_password_strength


def seed_super_admins(db: Session | None = None, force_sync_passwords: bool = False) -> list[User]:
    """Read credentials from environment variables / .env and create protected Super Admin accounts.
    
    Fails loudly if any environment variable is missing without creating partial accounts.
    Idempotent: skips accounts that already exist and never overwrites existing account data
    unless force_sync_passwords is explicitly True.
    Returns list of newly created User records (empty on subsequent idempotent runs).
    """
    settings = get_settings()

    e1 = os.getenv("SUPERADMIN_1_EMAIL") or settings.superadmin_1_email
    p1 = os.getenv("SUPERADMIN_1_PASSWORD") or settings.superadmin_1_password
    e2 = os.getenv("SUPERADMIN_2_EMAIL") or settings.superadmin_2_email
    p2 = os.getenv("SUPERADMIN_2_PASSWORD") or settings.superadmin_2_password

    sync_env = (os.getenv("SUPERADMIN_SYNC_PASSWORDS") or "").strip().lower() in ("true", "1", "yes")
    should_sync = force_sync_passwords or sync_env or settings.superadmin_sync_passwords

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
            f"Please configure them in your .env or environment. No accounts were created."
        )

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
                # Ensure status and protection flags are correct on existing accounts
                existing.is_protected = True
                existing.is_active = True
                existing.role = UserRole.SUPER_ADMIN
                if existing.email_verified_at is None:
                    existing.email_verified_at = now

                if should_sync:
                    existing.password_hash = hash_password(password)
                    print(f"[*] Updated password for existing protected super admin: {email}")
                else:
                    print(f"[*] Super admin account already exists: {email} (password preserved). "
                          f"To sync password with env var, pass --force-sync-passwords.")
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
            print(f"[+] Created protected super admin account: {email}")

        db.commit()
        for u in created_users:
            db.refresh(u)
        return created_users
    finally:
        if close_on_exit:
            db.close()


def startup_seed_super_admins() -> None:
    """Invoked on application startup. Seeds super admins if credentials are provided."""
    settings = get_settings()
    if settings.app_env == "test":
        return

    e1 = os.getenv("SUPERADMIN_1_EMAIL") or settings.superadmin_1_email
    p1 = os.getenv("SUPERADMIN_1_PASSWORD") or settings.superadmin_1_password
    e2 = os.getenv("SUPERADMIN_2_EMAIL") or settings.superadmin_2_email
    p2 = os.getenv("SUPERADMIN_2_PASSWORD") or settings.superadmin_2_password

    # Only run automatically if at least one variable is defined
    if any([e1, p1, e2, p2]):
        try:
            seed_super_admins()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Failed to seed super admins on startup: %s", exc)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed protected Super Admin accounts.")
    parser.add_argument(
        "--force-sync-passwords",
        action="store_true",
        help="Update passwords for existing accounts to match environment variables.",
    )
    args = parser.parse_args()

    try:
        created = seed_super_admins(force_sync_passwords=args.force_sync_passwords)
        print(f"Super admin seed complete. Provisioned {len(created)} new account(s).")
    except Exception as exc:
        print(f"Error seeding super admins: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
