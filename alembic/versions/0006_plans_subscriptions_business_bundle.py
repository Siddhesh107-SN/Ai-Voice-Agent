"""plans subscriptions and business bundle

Revision ID: 0006
Revises: 0005
"""
from datetime import datetime, time, timedelta, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create plans table
    op.create_table(
        "plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("monthly_price", sa.Integer(), nullable=True),
        sa.Column("yearly_price", sa.Integer(), nullable=True),
        sa.Column("included_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_call_minutes", sa.Integer(), server_default="5", nullable=False),
        sa.Column("is_custom", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", name="uq_plans_key"),
    )
    op.create_index(op.f("ix_plans_key"), "plans", ["key"], unique=True)

    # 2. Create subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column(
            "billing_cycle",
            sa.Enum("monthly", "yearly", name="billing_cycle", native_enum=False, length=16),
            server_default="monthly",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "active", "cancelled", name="subscription_status", native_enum=False, length=16),
            server_default="active",
            nullable=False,
        ),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("renews_on", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriptions_client_id"), "subscriptions", ["client_id"], unique=False)
    op.create_index("ix_subscriptions_client_status", "subscriptions", ["client_id", "status"], unique=False)

    # 3. Create minute_packs table
    op.create_table(
        "minute_packs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("added_by_user_id", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_minute_packs_client_id"), "minute_packs", ["client_id"], unique=False)

    # 4. Create business_hours table
    op.create_table(
        "business_hours",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("open_time", sa.Time(), nullable=True),
        sa.Column("close_time", sa.Time(), nullable=True),
        sa.Column("closed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id", "weekday", name="uq_business_hours_client_weekday"),
    )
    op.create_index(op.f("ix_business_hours_client_id"), "business_hours", ["client_id"], unique=False)

    # 5. Create services table
    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id", "name", name="uq_services_client_name"),
    )
    op.create_index(op.f("ix_services_client_id"), "services", ["client_id"], unique=False)

    # 6. Create staff_members table
    op.create_table(
        "staff_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=True),
        sa.Column(
            "available_days",
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_staff_members_client_id"), "staff_members", ["client_id"], unique=False)

    # 7. Seed plans
    plans_table = sa.table(
        "plans",
        sa.column("key", sa.String),
        sa.column("name", sa.String),
        sa.column("monthly_price", sa.Integer),
        sa.column("yearly_price", sa.Integer),
        sa.column("included_minutes", sa.Integer),
        sa.column("max_call_minutes", sa.Integer),
        sa.column("is_custom", sa.Boolean),
    )
    op.bulk_insert(
        plans_table,
        [
            {
                "key": "starter",
                "name": "Starter",
                "monthly_price": 2250,
                "yearly_price": 25200,
                "included_minutes": 300,
                "max_call_minutes": 5,
                "is_custom": False,
            },
            {
                "key": "growth",
                "name": "Growth",
                "monthly_price": 5700,
                "yearly_price": 66000,
                "included_minutes": 1000,
                "max_call_minutes": 5,
                "is_custom": False,
            },
            {
                "key": "business",
                "name": "Business",
                "monthly_price": 14250,
                "yearly_price": 165000,
                "included_minutes": 2500,
                "max_call_minutes": 5,
                "is_custom": False,
            },
            {
                "key": "enterprise",
                "name": "Enterprise",
                "monthly_price": None,
                "yearly_price": None,
                "included_minutes": 0,
                "max_call_minutes": 5,
                "is_custom": True,
            },
        ],
    )

    # 8. Seed subscriptions and business hours for existing clients
    conn = op.get_bind()
    client_ids = [row[0] for row in conn.execute(sa.text("SELECT id FROM clients")).fetchall()]
    growth_row = conn.execute(sa.text("SELECT id FROM plans WHERE key = 'growth'")).fetchone()

    if client_ids and growth_row:
        growth_plan_id = growth_row[0]
        now = datetime.now(timezone.utc)
        renews = now + timedelta(days=30)

        # Subscriptions
        subs_table = sa.table(
            "subscriptions",
            sa.column("client_id", sa.Integer),
            sa.column("plan_id", sa.Integer),
            sa.column("billing_cycle", sa.String),
            sa.column("status", sa.String),
            sa.column("period_start", sa.DateTime),
            sa.column("renews_on", sa.DateTime),
        )
        op.bulk_insert(
            subs_table,
            [
                {
                    "client_id": cid,
                    "plan_id": growth_plan_id,
                    "billing_cycle": "monthly",
                    "status": "active",
                    "period_start": now,
                    "renews_on": renews,
                }
                for cid in client_ids
            ],
        )

        # Business hours: Mon-Fri 09:00-18:00, Sat 09:00-14:00, Sun closed
        hours_table = sa.table(
            "business_hours",
            sa.column("client_id", sa.Integer),
            sa.column("weekday", sa.Integer),
            sa.column("open_time", sa.Time),
            sa.column("close_time", sa.Time),
            sa.column("closed", sa.Boolean),
        )
        hours_rows = []
        for cid in client_ids:
            for day in range(5):  # Mon-Fri
                hours_rows.append(
                    {"client_id": cid, "weekday": day, "open_time": time(9, 0), "close_time": time(18, 0), "closed": False}
                )
            # Sat
            hours_rows.append(
                {"client_id": cid, "weekday": 5, "open_time": time(9, 0), "close_time": time(14, 0), "closed": False}
            )
            # Sun
            hours_rows.append(
                {"client_id": cid, "weekday": 6, "open_time": None, "close_time": None, "closed": True}
            )
        op.bulk_insert(hours_table, hours_rows)


def downgrade() -> None:
    op.drop_index(op.f("ix_staff_members_client_id"), table_name="staff_members")
    op.drop_table("staff_members")

    op.drop_index(op.f("ix_services_client_id"), table_name="services")
    op.drop_table("services")

    op.drop_index(op.f("ix_business_hours_client_id"), table_name="business_hours")
    op.drop_table("business_hours")

    op.drop_index(op.f("ix_minute_packs_client_id"), table_name="minute_packs")
    op.drop_table("minute_packs")

    op.drop_index("ix_subscriptions_client_status", table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_client_id"), table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index(op.f("ix_plans_key"), table_name="plans")
    op.drop_table("plans")
