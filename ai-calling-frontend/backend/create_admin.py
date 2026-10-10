import os
import sys
from pathlib import Path
import argparse
import uuid
import datetime

# Add project root and backend dir to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from backend.app.db.database import get_db_connection, init_db
    from backend.app.core.security import hash_password
except ImportError:
    from app.db.database import get_db_connection, init_db
    from app.core.security import hash_password

def create_user(email: str, password: str, name: str, role: str, business_id: str):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    email_clean = email.strip().lower()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email_clean,))
    existing = cursor.fetchone()

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pass_hash = hash_password(password)

    if existing:
        cursor.execute("""
        UPDATE users
        SET password_hash = ?, name = ?, role = ?, client_id = ?, is_active = 1
        WHERE id = ?
        """, (pass_hash, name, role, business_id, existing["id"]))
        user_id = existing["id"]
        print(f"[OK] Updated existing user '{email_clean}' with role '{role}' (ID: {user_id})")
    else:
        user_id = f"user-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO users (id, client_id, name, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, (user_id, business_id, name, email_clean, pass_hash, role, now))
        print(f"[OK] Created new user '{email_clean}' with role '{role}' (ID: {user_id})")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TalkAor Admin CLI User Manager")
    parser.add_argument("--role", choices=["SUPER_ADMIN", "BUSINESS_ADMIN", "STAFF"], required=True, help="User role")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--name", required=True, help="User display name")
    parser.add_argument("--business-id", default="client-talkaor-01", help="Business ID (use 'platform-system' for SUPER_ADMIN)")

    args = parser.parse_args()
    biz_id = "platform-system" if args.role == "SUPER_ADMIN" else args.business_id
    create_user(args.email, args.password, args.name, args.role, biz_id)
