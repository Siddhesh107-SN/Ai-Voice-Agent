"""access status, refresh tokens, and staff pin

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    client_cols = [c["name"] for c in inspector.get_columns("clients")]

    # 1. Add columns to clients
    if "access_status" not in client_cols:
        op.add_column(
            "clients",
            sa.Column(
                "access_status",
                sa.Enum(
                    "pending_payment",
                    "payment_review",
                    "active",
                    "declined",
                    "suspended",
                    name="access_status",
                    native_enum=False,
                    length=32,
                ),
                server_default="pending_payment",
                nullable=False,
            ),
        )

    if "onboarding_stage" not in client_cols:
        op.add_column(
            "clients",
            sa.Column(
                "onboarding_stage",
                sa.Enum(
                    "awaiting_payment_verification",
                    "awaiting_business_requirements",
                    "agent_configuration",
                    "testing_review",
                    "setup_complete",
                    name="onboarding_stage",
                    native_enum=False,
                    length=64,
                ),
                nullable=True,
            ),
        )

    if "country_code" not in client_cols:
        op.add_column(
            "clients",
            sa.Column("country_code", sa.String(length=16), nullable=True),
        )

    if "phone" not in client_cols:
        op.add_column(
            "clients",
            sa.Column("phone", sa.String(length=32), nullable=True),
        )

    # 2. Add email_verified_at to users
    user_cols = [c["name"] for c in inspector.get_columns("users")]
    if "email_verified_at" not in user_cols:
        op.add_column(
            "users",
            sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        )

    # 3. Update existing clients so current customers are not locked out
    op.execute(
        "UPDATE clients SET access_status = 'active', onboarding_stage = 'setup_complete'"
    )

    # 4. Create refresh_tokens table
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False
    )

    # 5. Create staff_pins table
    op.create_table(
        "staff_pins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("pin_encrypted", sa.Text(), nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("changed_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id", name="uq_staff_pins_client_id"),
    )
    op.create_index(
        op.f("ix_staff_pins_client_id"), "staff_pins", ["client_id"], unique=True
    )

    # 6. Create pin_attempts table
    op.create_table(
        "pin_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("failed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_pin_attempts_client_id"), "pin_attempts", ["client_id"], unique=False
    )
    op.create_index(
        op.f("ix_pin_attempts_user_id"), "pin_attempts", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pin_attempts_user_id"), table_name="pin_attempts")
    op.drop_index(op.f("ix_pin_attempts_client_id"), table_name="pin_attempts")
    op.drop_table("pin_attempts")

    op.drop_index(op.f("ix_staff_pins_client_id"), table_name="staff_pins")
    op.drop_table("staff_pins")

    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_column("users", "email_verified_at")
    op.drop_column("clients", "country_code")
    op.drop_column("clients", "onboarding_stage")
    op.drop_column("clients", "access_status")
