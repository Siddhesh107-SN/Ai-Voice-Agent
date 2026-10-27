"""add is_protected to users and mark super admins

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users: is_protected BOOLEAN NOT NULL DEFAULT false
    op.add_column(
        "users",
        sa.Column(
            "is_protected",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    # 2. Mark existing permanent super admin accounts as protected and active if present
    op.execute(
        sa.text(
            "UPDATE users SET is_protected = true, is_active = true, "
            "email_verified_at = COALESCE(email_verified_at, NOW()) "
            "WHERE LOWER(email) IN ('sufiyan@talkaor.tech', 'siddhesh@talkaor.tech')"
        )
    )


def downgrade() -> None:
    op.drop_column("users", "is_protected")
