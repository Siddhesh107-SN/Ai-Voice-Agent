"""payments and email verifications

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("plan_key", sa.String(length=32), nullable=False),
        sa.Column(
            "billing_cycle",
            sa.Enum("monthly", "yearly", name="billing_cycle", native_enum=False, length=16),
            nullable=False,
        ),
        sa.Column("amount_expected", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=False),
        sa.Column("transaction_id", sa.String(length=64), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payer_name", sa.String(length=150), nullable=True),
        sa.Column("screenshot_path", sa.String(length=500), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending_verification",
                "verified",
                "rejected",
                name="payment_status",
                native_enum=False,
                length=32,
            ),
            server_default="pending_verification",
            nullable=False,
        ),
        sa.Column("amount_mismatch", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], name="fk_payments_client_id"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], name="fk_payments_reviewed_by"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_client_id"), "payments", ["client_id"], unique=False)
    op.create_index("uq_payments_transaction_id_lower", "payments", [sa.text("lower(transaction_id)")], unique=True)
    op.create_index("ix_payments_client_created", "payments", ["client_id", "created_at"], unique=False)

    # 2. Create email_verifications table
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_email_verifications_user_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_verifications_user_id"), "email_verifications", ["user_id"], unique=False)
    op.create_index("ix_email_verifications_user_created", "email_verifications", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_email_verifications_user_created", table_name="email_verifications")
    op.drop_index(op.f("ix_email_verifications_user_id"), table_name="email_verifications")
    op.drop_table("email_verifications")

    op.drop_index("ix_payments_client_created", table_name="payments")
    op.drop_index("uq_payments_transaction_id_lower", table_name="payments")
    op.drop_index(op.f("ix_payments_client_id"), table_name="payments")
    op.drop_table("payments")
