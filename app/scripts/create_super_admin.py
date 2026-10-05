"""Create the platform SUPER_ADMIN (cannot be created through the public API).

Usage: python -m app.scripts.create_super_admin --email you@example.com --name "Your Name"
"""
import argparse
import getpass

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.utils.validators import validate_password_strength


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = validate_password_strength(getpass.getpass("Password: "))

    with SessionLocal() as db:
        repo = UserRepository(db)
        if repo.get_by_email(args.email):
            raise SystemExit("A user with this email already exists")
        repo.add(User(client_id=None, name=args.name, email=args.email.lower(),
                      password_hash=hash_password(password), role=UserRole.SUPER_ADMIN))
        db.commit()
    print("Super admin created.")


if __name__ == "__main__":
    main()
