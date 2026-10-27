"""Tests for permanent, protected Super Admin accounts, idempotent seed, and protection rules."""
import os
import pytest
from sqlalchemy import select

from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.security import verify_password
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate
from app.scripts.seed_super_admins import seed_super_admins
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.protection_service import ProtectedUserError, assert_user_not_protected
from app.services.user_service import UserService
from tests.helpers import auth_headers

PW1 = "Suf1yanSuperSecretPass!"
PW2 = "Siddh3shSuperSecretPass!"


@pytest.fixture
def superadmin_env(monkeypatch):
    monkeypatch.setenv("SUPERADMIN_1_EMAIL", "sufiyan@talkaor.tech")
    monkeypatch.setenv("SUPERADMIN_1_PASSWORD", PW1)
    monkeypatch.setenv("SUPERADMIN_2_EMAIL", "siddhesh@talkaor.tech")
    monkeypatch.setenv("SUPERADMIN_2_PASSWORD", PW2)


# ==================== 1. IDEMPOTENT SEED TESTS ====================

def test_seed_super_admins_creates_both_accounts(db, superadmin_env):
    """Seed script provisions both accounts with role=super_admin and is_protected=True."""
    created = seed_super_admins(db)
    assert len(created) == 2

    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    assert u1 is not None
    assert u1.role == UserRole.SUPER_ADMIN
    assert u1.is_protected is True
    assert u1.is_active is True
    assert u1.client_id is None
    assert u1.email_verified is True
    assert verify_password(PW1, u1.password_hash)

    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))
    assert u2 is not None
    assert u2.role == UserRole.SUPER_ADMIN
    assert u2.is_protected is True
    assert u2.is_active is True
    assert u2.client_id is None
    assert u2.email_verified is True
    assert verify_password(PW2, u2.password_hash)


def test_seed_super_admins_is_idempotent(db, superadmin_env):
    """Running seed a second time creates no duplicates and never overwrites existing data."""
    first_run = seed_super_admins(db)
    assert len(first_run) == 2

    u1_before = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u1_hash_before = u1_before.password_hash
    u1_id = u1_before.id

    second_run = seed_super_admins(db)
    assert len(second_run) == 0

    all_users = db.scalars(select(User).where(User.role == UserRole.SUPER_ADMIN)).all()
    assert len(all_users) == 2

    u1_after = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    assert u1_after.id == u1_id
    assert u1_after.password_hash == u1_hash_before


def test_seed_super_admins_fails_loudly_without_partial_creation(db, monkeypatch):
    """If an env var is missing, seed fails loudly and doesn't create partial accounts."""
    monkeypatch.setenv("SUPERADMIN_1_EMAIL", "sufiyan@talkaor.tech")
    monkeypatch.setenv("SUPERADMIN_1_PASSWORD", PW1)
    monkeypatch.setenv("SUPERADMIN_2_EMAIL", "siddhesh@talkaor.tech")
    monkeypatch.delenv("SUPERADMIN_2_PASSWORD", raising=False)

    with pytest.raises(ValueError) as exc:
        seed_super_admins(db)

    assert "SUPERADMIN_2_PASSWORD" in str(exc.value)

    # Ensure no partial account was created
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    assert u1 is None


# ==================== 2. LOGIN AND HARDENING TESTS ====================

def test_login_works_with_seeded_credentials(client, db, superadmin_env):
    """Login succeeds with the seeded credentials, returns tokens, and records audit log."""
    seed_super_admins(db)

    resp = client.post("/api/v1/auth/login", json={
        "email": "sufiyan@talkaor.tech",
        "password": PW1,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["user"]["email"] == "sufiyan@talkaor.tech"
    assert data["user"]["role"] == "super_admin"
    assert data["user"]["is_protected"] is True
    assert "access_token" in data["tokens"]

    # Verify audit log recorded successful login
    log = db.scalar(
        select(AuditLog)
        .where(AuditLog.action == "auth.login")
        .order_by(AuditLog.id.desc())
    )
    assert log is not None
    assert log.user_id == data["user"]["id"]


def test_login_failure_generic_error(client, db, superadmin_env):
    """Generic error message on bad credentials; no email enumeration."""
    seed_super_admins(db)

    resp = client.post("/api/v1/auth/login", json={
        "email": "sufiyan@talkaor.tech",
        "password": "WrongPassword123!",
    })
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "INVALID_CREDENTIALS"


def test_password_hash_never_returned_in_api(client, db, superadmin_env):
    """Password hashes are never returned in UserOut schema or API responses."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    out = UserOut.model_validate(u1).model_dump()
    assert "password_hash" not in out
    assert "password" not in out
    assert out["is_protected"] is True


# ==================== 3. PROTECTION RULE TESTS (ALL 403) ====================

def test_protected_user_cannot_be_deleted(db, superadmin_env):
    """Protected user cannot be deleted via AdminService or assert_user_not_protected."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.delete_user(target_user_id=u1.id, user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403

    # Verify audit log entry for blocked attempt
    log = db.scalar(
        select(AuditLog)
        .where(AuditLog.action == "user.modification_blocked")
        .order_by(AuditLog.id.desc())
    )
    assert log is not None
    assert log.level == "warn"


def test_protected_user_cannot_be_deactivated(db, superadmin_env):
    """Protected user cannot be deactivated (is_active=False) by anyone."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.update_user(target_user_id=u1.id, data=UserUpdate(is_active=False), user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403


def test_protected_user_cannot_change_role(db, superadmin_env):
    """Protected user cannot have role changed or demoted."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.update_user(target_user_id=u1.id, data=UserUpdate(role=UserRole.CLIENT_ADMIN), user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403


def test_protected_user_cannot_change_email(db, superadmin_env):
    """Protected user cannot have email changed."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.update_user(target_user_id=u1.id, data=UserUpdate(email="newmail@talkaor.tech"), user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403


def test_protected_user_cannot_change_is_protected_flag(db, superadmin_env):
    """Protected user cannot have is_protected flipped to False."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.update_user(target_user_id=u1.id, data=UserUpdate(is_protected=False), user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403


def test_password_reset_by_other_admin_rejected(db, superadmin_env):
    """Other admins or super admins cannot reset password of a protected user."""
    seed_super_admins(db)
    u1 = db.scalar(select(User).where(User.email == "sufiyan@talkaor.tech"))
    u2 = db.scalar(select(User).where(User.email == "siddhesh@talkaor.tech"))

    admin_svc = AdminService(db)
    with pytest.raises(ForbiddenError) as exc:
        admin_svc.reset_user_password(target_user_id=u1.id, new_password="NewPassword123!", user=u2, ip="127.0.0.1")
    assert exc.value.status_code == 403


def test_forgot_password_rejected_for_protected_user(db, superadmin_env):
    """Forgot password email resets are blocked for protected accounts with 403."""
    seed_super_admins(db)
    auth_svc = AuthService(db)

    with pytest.raises(ForbiddenError) as exc:
        auth_svc.forgot_password(email="sufiyan@talkaor.tech", ip="127.0.0.1")
    assert exc.value.status_code == 403

    # Check audit log
    log = db.scalar(
        select(AuditLog)
        .where(AuditLog.action == "user.modification_blocked")
        .order_by(AuditLog.id.desc())
    )
    assert log is not None
    assert log.level == "warn"


def test_owner_can_change_own_password_through_authenticated_flow(client, db, superadmin_env):
    """Account owner can change their own password, but only by supplying correct current password."""
    seed_super_admins(db)

    # 1. Login to get access token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "sufiyan@talkaor.tech",
        "password": PW1,
    })
    token = login_resp.json()["data"]["tokens"]["access_token"]
    headers = auth_headers(token)

    # 2. Attempt change with WRONG current password -> fails 400
    bad_resp = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "WrongCurrentPassword123!",
        "new_password": "BrandNewPassword123!",
    })
    assert bad_resp.status_code == 400
    assert bad_resp.json()["error_code"] == "INVALID_CURRENT_PASSWORD"

    # 3. Attempt change with CORRECT current password -> succeeds 200
    good_resp = client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": PW1,
        "new_password": "BrandNewPassword123!",
    })
    assert good_resp.status_code == 200

    # 4. Old password no longer works
    assert client.post("/api/v1/auth/login", json={
        "email": "sufiyan@talkaor.tech",
        "password": PW1,
    }).status_code == 401

    # 5. New password works
    assert client.post("/api/v1/auth/login", json={
        "email": "sufiyan@talkaor.tech",
        "password": "BrandNewPassword123!",
    }).status_code == 200
