"""Billing, subscription management, minute tracking and plan catalog."""
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.call import Call
from app.models.enums import BillingCycle, PlanKey, SubscriptionStatus
from app.models.plan import MinutePack, Plan, Subscription


def minutes_for_call(duration_seconds: float | int | None) -> int:
    """Calculate billed minutes for a call duration: ceil(duration_seconds / 60).
    Rule is isolated here so it can be changed later without modifying callers."""
    if duration_seconds is None or duration_seconds <= 0:
        return 0
    return math.ceil(duration_seconds / 60)


class BillingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_plans(self) -> list[Plan]:
        """Public list of active platform plans."""
        return list(self.db.scalars(select(Plan).order_by(Plan.id)).all())

    def get_or_create_default_subscription(self, client_id: int) -> Subscription:
        """Find active subscription for client or initialize default growth plan."""
        sub = self.db.scalar(
            select(Subscription).where(
                Subscription.client_id == client_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
        if sub is not None:
            return sub

        # Fallback to create default active growth subscription
        growth_plan = self.db.scalar(select(Plan).where(Plan.key == "growth"))
        if not growth_plan:
            growth_plan = Plan(
                key="growth",
                name="Growth",
                monthly_price=5700,
                yearly_price=66000,
                included_minutes=1000,
                max_call_minutes=5,
                is_custom=False,
            )
            self.db.add(growth_plan)
            self.db.flush()

        now = datetime.now(timezone.utc)
        sub = Subscription(
            client_id=client_id,
            plan_id=growth_plan.id,
            billing_cycle=BillingCycle.MONTHLY,
            status=SubscriptionStatus.ACTIVE,
            period_start=now,
            renews_on=now + timedelta(days=30),
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        return sub

    def get_billing_me(self, client_id: int) -> dict:
        """Return billing breakdown: plan, cycle, limits, usage, alerts and renewal."""
        sub = self.get_or_create_default_subscription(client_id)
        plan = self.db.get(Plan, sub.plan_id)
        plan_key = plan.key if plan else "growth"
        plan_included = plan.included_minutes if plan else 1000

        # Sum minute packs added in the current period
        packs = self.db.scalars(
            select(MinutePack).where(
                MinutePack.client_id == client_id,
                MinutePack.created_at >= sub.period_start,
                MinutePack.created_at <= sub.renews_on,
            )
        ).all()
        extra_minutes = sum(p.minutes for p in packs)
        minutes_limit = plan_included + extra_minutes

        # Sum call minutes in current period
        calls = self.db.scalars(
            select(Call).where(
                Call.client_id == client_id,
                Call.created_at >= sub.period_start,
                Call.created_at <= sub.renews_on,
            )
        ).all()
        minutes_used = sum(minutes_for_call(c.duration) for c in calls)
        minutes_remaining = max(0, minutes_limit - minutes_used)

        usage_percent = (
            round((minutes_used / minutes_limit) * 100, 1) if minutes_limit > 0 else 0.0
        )

        if usage_percent >= 100:
            alert = "limit"
        elif usage_percent >= 80:
            alert = "warning"
        else:
            alert = "none"

        cycle_str = sub.billing_cycle.value if hasattr(sub.billing_cycle, "value") else str(sub.billing_cycle)
        if cycle_str == "yearly":
            next_payment = plan.yearly_price if plan else None
        else:
            next_payment = plan.monthly_price if plan else None

        return {
            "plan": plan_key,
            "billing_cycle": cycle_str,
            "minutes_limit": minutes_limit,
            "minutes_used": minutes_used,
            "minutes_remaining": minutes_remaining,
            "usage_percent": usage_percent,
            "alert": alert,
            "renews_on": sub.renews_on,
            "next_payment_amount": next_payment,
        }
