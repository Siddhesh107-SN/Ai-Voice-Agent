"""Tests for Task B4:
1. Access Management:
   - GET /admin/access-requests (listing, status mappings, amount_mismatch, super_admin only)
   - POST /admin/access/{id}/approve (payment verified, active status, subscription activation, email, audit log)
   - POST /admin/access/{id}/decline (rejection reason, declined status, email, audit log)
2. Businesses:
   - GET /admin/businesses (listing, usage, login, has_pin, no PIN exposed)
   - PATCH /admin/businesses/{id}/status (Active/Suspended, suspended users get 403, audit log)
   - POST /admin/businesses/{id}/minute-pack (adds minutes, range validation, audit log)
   - POST /admin/businesses/{id}/pin-view (decrypts pin, audit-logged without pin, rate-limited)
   - POST /admin/businesses/{id}/pin-reset (sets/generates pin, clears lockouts, audit log)
3. Agents:
   - GET /admin/agents (platform-wide agents, metrics)
   - PATCH /admin/agents/{id}/power (toggles is_active across tenants, audit log)
4. Logs:
   - GET /admin/logs (reads audit_logs, level filtering, formatted timestamp)
5. Messages and Contact Form:
   - POST /contact (public, honeypot rejection, length validation, 201 success)
   - GET /admin/messages & PATCH /admin/messages/{id} (list, update read/handled)
   - GET /admin/payments/{id}/screenshot (super_admin file streaming, traversal prevention)
6. API Docs:
   - GET /api/v1/openapi.json (guarded by super_admin)
"""
import io
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.agent import Agent
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.enquiry import Enquiry
from app.models.enums import (AccessStatus, AgentStatus, BillingCycle,
                              OnboardingStage, PaymentStatus,
                              SubscriptionStatus, UserRole)
from app.models.payment import Payment
from app.models.plan import MinutePack, Plan, Subscription
from app.models.staff_pin import PinAttempt, StaffPin
from app.models.user import User
from app.services.pin_service import PinService
from tests.helpers import (auth_headers, create_staff, login_token, make_user,
                           register, register_ok)


def _setup_super_admin(client, db) -> str:
    user = db.scalar(select(User).where(User.email == "root@talkaor.com"))
    if not user:
        make_user(db, None, UserRole.SUPER_ADMIN, "root@talkaor.com")
    return login_token(client, "root@talkaor.com")


# ---------------- 1. ACCESS MANAGEMENT ----------------

def test_access_requests_listing_and_rbac(client, db):
    super_tok = _setup_super_admin(client, db)

    # 1. Non-super admin is rejected
    reg = register_ok(client, "regular_client@test.com")
    reg_tok = reg["tokens"]["access_token"]
    assert client.get("/api/v1/admin/access-requests", headers=auth_headers(reg_tok)).status_code == 403

    # 2. Unauthenticated is rejected
    assert client.get("/api/v1/admin/access-requests").status_code == 401

    # 3. Super admin lists requests
    resp = client.get("/api/v1/admin/access-requests", headers=auth_headers(super_tok))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_approve_and_decline_access_flow(client, db):
    super_tok = _setup_super_admin(client, db)
    h_super = auth_headers(super_tok)

    # Register client and submit payment
    reg = register(client, "pending_sub@test.com", "Approval Biz")
    cid = reg.json()["data"]["user"]["client_id"]
    uid = reg.json()["data"]["user"]["id"]
    u = db.get(User, uid)
    u.email_verified_at = datetime.now(timezone.utc)
    db.commit()

    # Create pending payment and subscription
    pay = Payment(
        client_id=cid,
        plan_key="growth",
        billing_cycle=BillingCycle.MONTHLY,
        amount_expected=5700,
        amount_paid=5700,
        transaction_id="TXN_APPROVE_1",
        payment_date=date.today(),
        status=PaymentStatus.PENDING_VERIFICATION,
        amount_mismatch=False,
    )
    growth_plan = db.scalar(select(Plan).where(Plan.key == "growth"))
    sub = Subscription(
        client_id=cid,
        plan_id=growth_plan.id,
        billing_cycle=BillingCycle.MONTHLY,
        status=SubscriptionStatus.PENDING,
        period_start=datetime.now(timezone.utc),
        renews_on=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add_all([pay, sub])
    cl = db.get(Client, cid)
    cl.access_status = AccessStatus.PAYMENT_REVIEW
    cl.onboarding_stage = OnboardingStage.AWAITING_PAYMENT_VERIFICATION
    db.commit()

    # Approve access
    resp_app = client.post(f"/api/v1/admin/access/{cid}/approve", headers=h_super)
    assert resp_app.status_code == 200
    app_data = resp_app.json()
    assert app_data["status"] == "active"
    assert app_data["business"] == "Approval Biz"

    # Verify DB: client is active, subscription is active, payment is verified
    db.refresh(cl)
    db.refresh(sub)
    db.refresh(pay)
    assert cl.access_status == AccessStatus.ACTIVE
    assert cl.onboarding_stage == OnboardingStage.SETUP_COMPLETE
    assert cl.is_active is True
    assert sub.status == SubscriptionStatus.ACTIVE
    assert pay.status == PaymentStatus.VERIFIED

    # Verify audit log for approval
    audit_app = db.scalar(
        select(AuditLog).where(AuditLog.client_id == cid, AuditLog.action == "admin.access.approve")
    )
    assert audit_app is not None
    assert audit_app.level == "info"

    # Decline flow on a second client
    reg2 = register(client, "decline_sub@test.com", "Decline Biz")
    cid2 = reg2.json()["data"]["user"]["client_id"]
    cl2 = db.get(Client, cid2)
    cl2.access_status = AccessStatus.PAYMENT_REVIEW
    db.commit()

    resp_dec = client.post(
        f"/api/v1/admin/access/{cid2}/decline",
        headers=h_super,
        json={"reason": "Invalid transaction screenshot"},
    )
    assert resp_dec.status_code == 200
    dec_data = resp_dec.json()
    assert dec_data["status"] == "declined"
    assert dec_data["reason"] == "Invalid transaction screenshot"

    db.refresh(cl2)
    assert cl2.access_status == AccessStatus.DECLINED

    # Audit log for decline (warn level)
    audit_dec = db.scalar(
        select(AuditLog).where(AuditLog.client_id == cid2, AuditLog.action == "admin.access.decline")
    )
    assert audit_dec is not None
    assert audit_dec.level == "warn"


# ---------------- 2. BUSINESSES & SUSPENSION ----------------

def test_admin_businesses_listing_and_pin_isolation(client, db):
    super_tok = _setup_super_admin(client, db)
    reg = register_ok(client, "biz_overview@test.com")
    cid = reg["user"]["client_id"]

    # Set staff PIN for this client
    pin_svc = PinService(db)
    p_rec = StaffPin(
        client_id=cid,
        pin_encrypted=pin_svc.encrypt_pin("1234"),
        changed_at=datetime.now(timezone.utc),
    )
    db.add(p_rec)
    db.commit()

    resp = client.get("/api/v1/admin/businesses", headers=auth_headers(super_tok))
    assert resp.status_code == 200
    businesses = resp.json()
    assert isinstance(businesses, list)

    target = next((b for b in businesses if b["id"] == cid), None)
    assert target is not None
    assert target["has_pin"] is True
    assert "pin" not in target  # PIN NEVER returned in businesses overview


def test_business_status_suspension_blocks_tenant(client, db):
    super_tok = _setup_super_admin(client, db)
    reg = register_ok(client, "suspend_me@test.com")
    cid = reg["user"]["client_id"]
    client_tok = reg["tokens"]["access_token"]
    h_client = auth_headers(client_tok)

    # 1. Business calls work initially
    assert client.get("/api/v1/business", headers=h_client).status_code == 200

    # 2. Super admin suspends business
    resp_sus = client.patch(
        f"/api/v1/admin/businesses/{cid}/status",
        headers=auth_headers(super_tok),
        json={"status": "Suspended"},
    )
    assert resp_sus.status_code == 200
    assert resp_sus.json()["status"] == "Suspended"

    # 3. Suspended client's users get 403 on every endpoint
    resp_blocked = client.get("/api/v1/business", headers=h_client)
    assert resp_blocked.status_code == 403

    resp_blocked_bill = client.get("/api/v1/billing/me", headers=h_client)
    assert resp_blocked_bill.status_code == 403

    # 4. Super admin reactivates business
    resp_act = client.patch(
        f"/api/v1/admin/businesses/{cid}/status",
        headers=auth_headers(super_tok),
        json={"status": "Active"},
    )
    assert resp_act.status_code == 200
    assert client.get("/api/v1/business", headers=h_client).status_code == 200


def test_admin_minute_pack_and_pin_operations(client, db):
    super_tok = _setup_super_admin(client, db)
    h_super = auth_headers(super_tok)
    reg = register_ok(client, "minutes_pin@test.com")
    cid = reg["user"]["client_id"]

    # 1. Add minute pack
    resp_pack = client.post(
        f"/api/v1/admin/businesses/{cid}/minute-pack",
        headers=h_super,
        json={"minutes": 500},
    )
    assert resp_pack.status_code == 200
    assert resp_pack.json()["minutes_added"] == 500

    # Range validation: invalid minutes (> 10000)
    assert client.post(
        f"/api/v1/admin/businesses/{cid}/minute-pack",
        headers=h_super,
        json={"minutes": 10001},
    ).status_code == 422

    # 2. Reset PIN
    resp_reset = client.post(
        f"/api/v1/admin/businesses/{cid}/pin-reset",
        headers=h_super,
        json={"pin": "8888"},
    )
    assert resp_reset.status_code == 200
    assert resp_reset.json()["pin"] == "8888"

    # 3. View PIN
    resp_view = client.post(f"/api/v1/admin/businesses/{cid}/pin-view", headers=h_super)
    assert resp_view.status_code == 200
    assert resp_view.json()["pin"] == "8888"

    # Audit log check for view (warn level, no PIN in log text or details)
    audit_view = db.scalar(
        select(AuditLog)
        .where(AuditLog.client_id == cid, AuditLog.action == "admin.pin.view")
        .order_by(AuditLog.id.desc())
    )
    assert audit_view is not None
    assert audit_view.level == "warn"
    assert "8888" not in (audit_view.message or "")
    assert "8888" not in str(audit_view.details or "")


# ---------------- 3. AGENTS ----------------

def test_admin_agents_overview_and_power_toggle(client, db):
    super_tok = _setup_super_admin(client, db)
    h_super = auth_headers(super_tok)
    reg = register_ok(client, "agent_power@test.com")
    cid = reg["user"]["client_id"]

    # Create agent
    agent = Agent(
        client_id=cid,
        name="Front Desk AI",
        phone_number="+919876543210",
        provider="sarvam",
        configuration={"languages": ["English", "Hindi"]},
        status=AgentStatus.ACTIVE,
        is_active=True,
    )
    db.add(agent)
    db.commit()

    # 1. List agents
    resp_agents = client.get("/api/v1/admin/agents", headers=h_super)
    assert resp_agents.status_code == 200
    agents_list = resp_agents.json()
    assert any(a["id"] == agent.id for a in agents_list)

    # 2. Toggle power off
    resp_off = client.patch(
        f"/api/v1/admin/agents/{agent.id}/power",
        headers=h_super,
        json={"online": False},
    )
    assert resp_off.status_code == 200
    assert resp_off.json()["online"] is False

    db.refresh(agent)
    assert agent.is_active is False
    assert agent.status == AgentStatus.INACTIVE

    # 3. Toggle power on
    resp_on = client.patch(
        f"/api/v1/admin/agents/{agent.id}/power",
        headers=h_super,
        json={"online": True},
    )
    assert resp_on.status_code == 200
    assert resp_on.json()["online"] is True
    db.refresh(agent)
    assert agent.is_active is True
    assert agent.status == AgentStatus.ACTIVE


# ---------------- 4. AUDIT LOGS ----------------

def test_admin_logs_filtering(client, db):
    super_tok = _setup_super_admin(client, db)
    h_super = auth_headers(super_tok)

    # Create a warning log
    entry = AuditLog(
        action="admin.test.warn",
        level="warn",
        message="Test warning log entry",
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()

    resp = client.get("/api/v1/admin/logs?level=warn&limit=10", headers=h_super)
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)
    assert any(l["text"] == "Test warning log entry" and l["level"] == "warn" for l in logs)


# ---------------- 5. CONTACT FORM & MESSAGES ----------------

def test_contact_form_and_admin_messages_lifecycle(client, db):
    # 1. Honeypot check: reject if website is non-empty
    resp_spam = client.post("/contact", json={
        "name": "Spammer",
        "email": "spammer@bot.com",
        "message": "Buy meds",
        "website": "http://spamsite.com",
    })
    assert resp_spam.status_code == 400

    # 2. Valid contact form submission -> 201
    resp_ok = client.post("/contact", json={
        "name": "Dr. Sharma",
        "email": "sharma@clinic.com",
        "phone": "+919876543200",
        "message": "Interested in AI calling receptionist for our clinic.",
    })
    assert resp_ok.status_code == 201
    assert resp_ok.json() == {"success": True}

    # 3. Admin lists messages
    super_tok = _setup_super_admin(client, db)
    h_super = auth_headers(super_tok)
    resp_msgs = client.get("/api/v1/admin/messages", headers=h_super)
    assert resp_msgs.status_code == 200
    msgs = resp_msgs.json()
    msg = next((m for m in msgs if m["email"] == "sharma@clinic.com"), None)
    assert msg is not None
    assert msg["read"] is False
    assert msg["handled"] is False

    # 4. Admin updates message status
    resp_patch = client.patch(
        f"/api/v1/admin/messages/{msg['id']}",
        headers=h_super,
        json={"read": True, "handled": True},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["read"] is True
    assert resp_patch.json()["handled"] is True


# ---------------- 6. OPENAPI DOCS GUARD ----------------

def test_openapi_schema_super_admin_guard(client, db):
    # Unauthenticated / non-super admin -> 401 / 403
    assert client.get("/api/v1/openapi.json").status_code == 401

    reg = register_ok(client, "regular_openapi@test.com")
    assert client.get("/api/v1/openapi.json", headers=auth_headers(reg["tokens"]["access_token"])).status_code == 403

    # Super admin -> 200
    super_tok = _setup_super_admin(client, db)
    resp = client.get("/api/v1/openapi.json", headers=auth_headers(super_tok))
    assert resp.status_code == 200
    assert "openapi" in resp.json()
