"""The create_super_admin script is the only way to provision a SUPER_ADMIN."""
import pytest
from sqlalchemy import select

from app.models.enums import UserRole
from app.models.user import User
from app.scripts.create_super_admin import main


def test_creates_super_admin(db, monkeypatch):
    monkeypatch.setattr("sys.argv", ["create_super_admin", "--email", "root@platform.com",
                                     "--name", "Root"])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": "Sup3rSecret1")
    main()
    user = db.scalar(select(User).where(User.email == "root@platform.com"))
    assert user is not None and user.role == UserRole.SUPER_ADMIN and user.client_id is None


def test_refuses_duplicate_email(db, monkeypatch):
    monkeypatch.setattr("sys.argv", ["create_super_admin", "--email", "root2@platform.com",
                                     "--name", "Root"])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": "Sup3rSecret1")
    main()
    with pytest.raises(SystemExit):
        main()


def test_rejects_weak_password(monkeypatch):
    monkeypatch.setattr("sys.argv", ["create_super_admin", "--email", "root3@platform.com",
                                     "--name", "Root"])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": "short")
    with pytest.raises(ValueError):
        main()
