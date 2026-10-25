"""admin features and enquiry updates

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. users: last_login_at
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))

    # 2. clients: is_active
    op.add_column("clients", sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    # 3. agents: is_active
    op.add_column("agents", sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    # 4. audit_logs: level and message
    op.add_column("audit_logs", sa.Column("level", sa.String(length=16), server_default="info", nullable=True))
    op.add_column("audit_logs", sa.Column("message", sa.String(length=255), nullable=True))

    # 5. enquiries: contact form columns and make client_id/question nullable for public messages
    op.add_column("enquiries", sa.Column("name", sa.String(length=150), nullable=True))
    op.add_column("enquiries", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("enquiries", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("enquiries", sa.Column("message", sa.Text(), nullable=True))
    op.add_column("enquiries", sa.Column("read", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("enquiries", sa.Column("handled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.alter_column("enquiries", "client_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("enquiries", "question", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("enquiries", "question", existing_type=sa.Text(), nullable=False)
    op.alter_column("enquiries", "client_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("enquiries", "handled")
    op.drop_column("enquiries", "read")
    op.drop_column("enquiries", "message")
    op.drop_column("enquiries", "phone")
    op.drop_column("enquiries", "email")
    op.drop_column("enquiries", "name")

    op.drop_column("audit_logs", "message")
    op.drop_column("audit_logs", "level")

    op.drop_column("agents", "is_active")
    op.drop_column("clients", "is_active")
    op.drop_column("users", "last_login_at")
