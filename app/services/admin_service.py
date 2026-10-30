import os
import secrets
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi.responses import FileResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.agent import Agent
from app.models.audit_log import AuditLog
from app.models.call import Call
from app.models.client import Client
from app.models.enquiry import Enquiry
from app.models.enums import (AccessStatus, AgentStatus, BillingCycle,
                              OnboardingStage, PaymentStatus,
                              SubscriptionStatus)
from app.models.payment import Payment
from app.models.plan import MinutePack, Plan, Subscription
from app.models.staff_pin import PinAttempt, StaffPin
from app.models.user import User
from app.schemas.admin import (AccessActionResponse, AccessRequestItem,
                               AdminAgentItem, AdminBusinessItem,
                               AdminMessageItem, LogItem, PinResetResponse,
                               PinViewResponse)
from app.core.security import hash_password
from app.schemas.user import UserOut, UserUpdate
from app.services.audit_service import record_audit
from app.services.billing_service import BillingService
from app.services.email_service import EmailService
from app.services.pin_service import PinService
from app.services.protection_service import assert_user_not_protected
from app.utils.helpers import drop_nulls


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.email_service = EmailService()

    # ---------------- 1. ACCESS REQUESTS ----------------

    def get_access_requests(self) -> list[AccessRequestItem]:
        clients = self.db.scalars(
            select(Client)
            .where(
                Client.access_status.in_(
                    [AccessStatus.PAYMENT_REVIEW, AccessStatus.DECLINED, AccessStatus.ACTIVE]
                )
            )
            .order_by(Client.created_at.desc(), Client.id.desc())
        ).all()

        items: list[AccessRequestItem] = []
        for client in clients:
            latest_payment = self.db.scalar(
                select(Payment)
                .where(Payment.client_id == client.id)
                .order_by(Payment.created_at.desc(), Payment.id.desc())
                .limit(1)
            )
            if latest_payment is None:
                continue

            if latest_payment.amount_mismatch:
                status_label = "Needs review"
            elif client.access_status == AccessStatus.PAYMENT_REVIEW:
                status_label = "Payment submitted"
            elif client.access_status == AccessStatus.ACTIVE:
                status_label = "Approved"
            elif client.access_status == AccessStatus.DECLINED:
                status_label = "Declined"
            else:
                status_label = client.access_status.value.replace("_", " ").title()

            items.append(
                AccessRequestItem(
                    id=client.id,
                    business=client.business_name,
                    plan=latest_payment.plan_key,
                    billing=latest_payment.billing_cycle.value,
                    amount=latest_payment.amount_paid,
                    status=status_label,
                    transaction_id=latest_payment.transaction_id,
                    payer_name=latest_payment.payer_name,
                    payment_date=latest_payment.payment_date,
                    screenshot_available=bool(latest_payment.screenshot_path),
                    amount_mismatch=latest_payment.amount_mismatch,
                )
            )
        return items

    def approve_access(self, client_id: int, user: User, ip: str | None) -> AccessActionResponse:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        now = datetime.now(timezone.utc)

        # 1. Verify latest payment
        latest_payment = self.db.scalar(
            select(Payment)
            .where(Payment.client_id == client.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(1)
        )
        if latest_payment is not None:
            latest_payment.status = PaymentStatus.VERIFIED
            latest_payment.reviewed_by = user.id
            latest_payment.reviewed_at = now

        # 2. Update client access & onboarding
        client.access_status = AccessStatus.ACTIVE
        client.onboarding_stage = OnboardingStage.SETUP_COMPLETE
        client.is_active = True

        # 3. Activate pending subscription
        pending_sub = self.db.scalar(
            select(Subscription).where(
                Subscription.client_id == client.id,
                Subscription.status == SubscriptionStatus.PENDING,
            )
        )
        if pending_sub is not None:
            # Cancel any previous active subscription
            old_subs = self.db.scalars(
                select(Subscription).where(
                    Subscription.client_id == client.id,
                    Subscription.status == SubscriptionStatus.ACTIVE,
                )
            ).all()
            for s in old_subs:
                s.status = SubscriptionStatus.CANCELLED

            period_days = 30 if pending_sub.billing_cycle == BillingCycle.MONTHLY else 365
            pending_sub.status = SubscriptionStatus.ACTIVE
            pending_sub.period_start = now
            pending_sub.renews_on = now + timedelta(days=period_days)

        # 4. Dispatch approved email
        self.email_service.send_verification_email(
            client.email,
            "Your Talkaor account access has been approved! You now have full dashboard access.",
        )

        # 5. Audit log
        record_audit(
            self.db,
            action="admin.access.approve",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level="info",
            message=f"Super Admin approved access for {client.business_name}",
        )
        self.db.commit()

        return AccessActionResponse(
            id=client.id,
            business=client.business_name,
            status="active",
        )

    def decline_access(self, client_id: int, reason: str, user: User, ip: str | None) -> AccessActionResponse:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        now = datetime.now(timezone.utc)

        # 1. Reject payment
        latest_payment = self.db.scalar(
            select(Payment)
            .where(Payment.client_id == client.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(1)
        )
        if latest_payment is not None:
            latest_payment.status = PaymentStatus.REJECTED
            latest_payment.rejection_reason = reason
            latest_payment.reviewed_by = user.id
            latest_payment.reviewed_at = now

        # 2. Update client access
        client.access_status = AccessStatus.DECLINED

        # 3. Dispatch decline email
        self.email_service.send_verification_email(
            client.email,
            f"Your Talkaor payment verification was declined: {reason}. You can submit a new payment from the onboarding page.",
        )

        # 4. Audit log (warn level)
        record_audit(
            self.db,
            action="admin.access.decline",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level="warn",
            message=f"Super Admin declined access for {client.business_name}: {reason}",
            details={"reason": reason},
        )
        self.db.commit()

        return AccessActionResponse(
            id=client.id,
            business=client.business_name,
            status="declined",
            reason=reason,
        )

    # ---------------- 2. BUSINESSES ----------------

    def get_businesses(self) -> list[AdminBusinessItem]:
        clients = self.db.scalars(
            select(Client).order_by(Client.created_at.desc(), Client.id.desc())
        ).all()

        items: list[AdminBusinessItem] = []
        billing_service = BillingService(self.db)

        for client in clients:
            billing_data = billing_service.get_billing_me(client.id)

            status_label = "Suspended" if (
                client.access_status == AccessStatus.SUSPENDED or not client.is_active
            ) else "Active"

            # Last login: max users.last_login_at
            last_login = self.db.scalar(
                select(func.max(User.last_login_at)).where(User.client_id == client.id)
            )

            has_pin = self.db.scalar(
                select(StaffPin.id).where(StaffPin.client_id == client.id).limit(1)
            ) is not None

            items.append(
                AdminBusinessItem(
                    id=client.id,
                    name=client.business_name,
                    plan=billing_data["plan"],
                    minutes_used=billing_data["minutes_used"],
                    minutes_limit=billing_data["minutes_limit"],
                    status=status_label,
                    renews_on=billing_data["renews_on"],
                    last_login=last_login,
                    has_pin=has_pin,
                )
            )
        return items

    def update_business_status(self, client_id: int, status_str: str, user: User, ip: str | None) -> dict:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        # Status changes are only allowed for clients that were approved
        if client.access_status not in (AccessStatus.ACTIVE, AccessStatus.SUSPENDED):
            raise BadRequestError(
                "Status changes are only permitted for approved businesses.",
                error_code="BUSINESS_NOT_APPROVED",
            )

        if status_str == "Suspended":
            client.is_active = False
            client.access_status = AccessStatus.SUSPENDED
            level = "warn"
        else:
            client.is_active = True
            client.access_status = AccessStatus.ACTIVE
            level = "info"

        record_audit(
            self.db,
            action="admin.business.status",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level=level,
            message=f"Super Admin set status of {client.business_name} to {status_str}",
            details={"status": status_str},
        )
        self.db.commit()

        return {"id": client.id, "name": client.business_name, "status": status_str}

    def add_minute_pack(self, client_id: int, minutes: int, user: User, ip: str | None) -> dict:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        pack = MinutePack(
            client_id=client.id,
            minutes=minutes,
            added_by_user_id=user.id,
            note="Added by Super Admin",
        )
        self.db.add(pack)

        record_audit(
            self.db,
            action="admin.business.minute_pack",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level="info",
            message=f"Super Admin added {minutes} minutes to {client.business_name}",
            details={"minutes": minutes},
        )
        self.db.commit()

        return {"success": True, "minutes_added": minutes, "client_id": client.id}

    def view_pin(self, client_id: int, user: User, ip: str | None) -> PinViewResponse:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        staff_pin = self.db.scalar(select(StaffPin).where(StaffPin.client_id == client.id))
        if staff_pin is None:
            raise BadRequestError("No staff PIN configured for this business", error_code="PIN_NOT_SET")

        pin_service = PinService(self.db)
        decrypted_pin = pin_service.decrypt_pin(staff_pin.pin_encrypted)

        record_audit(
            self.db,
            action="admin.pin.view",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level="warn",
            message=f"Super Admin viewed the staff PIN for {client.business_name}",
        )
        self.db.commit()

        return PinViewResponse(
            pin=decrypted_pin,
            changedAt=staff_pin.changed_at.isoformat() if staff_pin.changed_at else None,
        )

    def reset_pin(self, client_id: int, pin: str | None, user: User, ip: str | None) -> PinResetResponse:
        client = self.db.get(Client, client_id)
        if client is None:
            raise NotFoundError(f"Client {client_id} not found")

        new_pin = pin.strip() if pin else f"{secrets.randbelow(10000):04d}"

        pin_service = PinService(self.db)
        encrypted = pin_service.encrypt_pin(new_pin)

        now = datetime.now(timezone.utc)
        staff_pin = self.db.scalar(select(StaffPin).where(StaffPin.client_id == client.id))
        if staff_pin is not None:
            staff_pin.pin_encrypted = encrypted
            staff_pin.changed_by_user_id = user.id
            staff_pin.changed_at = now
        else:
            staff_pin = StaffPin(
                client_id=client.id,
                pin_encrypted=encrypted,
                changed_by_user_id=user.id,
                changed_at=now,
            )
            self.db.add(staff_pin)

        # Clear lock counters for client
        self.db.execute(delete(PinAttempt).where(PinAttempt.client_id == client.id))

        record_audit(
            self.db,
            action="admin.pin.reset",
            user_id=user.id,
            client_id=client.id,
            entity_type="client",
            entity_id=client.id,
            ip_address=ip,
            level="warn",
            message=f"Super Admin reset staff PIN for {client.business_name}",
        )
        self.db.commit()

        return PinResetResponse(pin=new_pin, message="PIN reset successfully")

    # ---------------- 3. AGENTS ----------------

    def get_agents(self) -> list[AdminAgentItem]:
        agents = self.db.scalars(
            select(Agent).order_by(Agent.created_at.desc(), Agent.id.desc())
        ).all()

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        items: list[AdminAgentItem] = []

        for agent in agents:
            calls_today = self.db.scalar(
                select(func.count(Call.id)).where(
                    Call.agent_id == agent.id,
                    Call.started_at >= today_start,
                )
            ) or 0

            config = agent.configuration if isinstance(agent.configuration, dict) else {}
            languages = config.get("languages", ["English"])

            items.append(
                AdminAgentItem(
                    id=agent.id,
                    name=agent.name,
                    languages=languages if isinstance(languages, list) else [str(languages)],
                    phone=agent.phone_number,
                    online=agent.is_active,
                    calls_today=calls_today,
                    business_id=agent.client_id,
                    business_name=agent.client.business_name if agent.client else "",
                )
            )
        return items

    def toggle_agent_power(self, agent_id: int, online: bool, user: User, ip: str | None) -> dict:
        agent = self.db.get(Agent, agent_id)
        if agent is None:
            raise NotFoundError(f"Agent {agent_id} not found")

        agent.is_active = online
        agent.status = AgentStatus.ACTIVE if online else AgentStatus.INACTIVE

        record_audit(
            self.db,
            action="admin.agent.power",
            user_id=user.id,
            client_id=agent.client_id,
            entity_type="agent",
            entity_id=agent.id,
            ip_address=ip,
            level="info",
            message=f"Super Admin set agent {agent.name} (ID {agent.id}) online={online}",
            details={"online": online},
        )
        self.db.commit()

        return {"id": agent.id, "online": online, "status": agent.status.value}

    # ---------------- 4. LOGS ----------------

    def get_logs(self, level: str | None, limit: int, before: datetime | None) -> list[LogItem]:
        limit = min(max(1, limit), 100)
        stmt = select(AuditLog)

        if level:
            stmt = stmt.where(AuditLog.level == level.lower())
        if before:
            stmt = stmt.where(AuditLog.created_at < before)

        stmt = stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit)
        logs = self.db.scalars(stmt).all()

        items: list[LogItem] = []
        for log in logs:
            at_str = log.created_at.strftime("%d %b %H:%M")
            text = log.message or f"{log.action} on {log.entity_type or 'system'}"

            # Derive level if missing
            entry_level = log.level or (
                "warn" if any(k in log.action.lower() for k in ["pin", "decline", "suspend"]) else "info"
            )

            items.append(LogItem(at=at_str, text=text, level=entry_level))
        return items

    # ---------------- 5. MESSAGES AND CONTACT FORM ----------------

    def submit_contact(
        self, name: str, email: str, phone: str | None, message: str, website: str | None
    ) -> dict:
        # Honeypot: reject if hidden website field is populated
        if website:
            raise BadRequestError("Spam detected", error_code="SPAM_DETECTED")

        enquiry = Enquiry(
            name=name.strip(),
            email=email.strip(),
            phone=phone.strip() if phone else None,
            message=message.strip(),
            question=message.strip(),
            read=False,
            handled=False,
            client_id=None,
        )
        self.db.add(enquiry)
        self.db.commit()

        return {"success": True}

    def get_messages(self) -> list[AdminMessageItem]:
        enquiries = self.db.scalars(
            select(Enquiry).order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
        ).all()

        return [
            AdminMessageItem(
                id=e.id,
                name=e.name,
                email=e.email,
                phone=e.phone,
                message=e.message or e.question,
                received_at=e.created_at,
                read=e.read,
                handled=e.handled,
            )
            for e in enquiries
        ]

    def update_message(
        self, message_id: int, read: bool | None, handled: bool | None, user: User, ip: str | None
    ) -> AdminMessageItem:
        enquiry = self.db.get(Enquiry, message_id)
        if enquiry is None:
            raise NotFoundError(f"Message {message_id} not found")

        if read is not None:
            enquiry.read = read
        if handled is not None:
            enquiry.handled = handled

        record_audit(
            self.db,
            action="admin.message.update",
            user_id=user.id,
            entity_type="enquiry",
            entity_id=enquiry.id,
            ip_address=ip,
            level="info",
            message=f"Super Admin updated message {enquiry.id} status",
            details={"read": enquiry.read, "handled": enquiry.handled},
        )
        self.db.commit()

        return AdminMessageItem(
            id=enquiry.id,
            name=enquiry.name,
            email=enquiry.email,
            phone=enquiry.phone,
            message=enquiry.message or enquiry.question,
            received_at=enquiry.created_at,
            read=enquiry.read,
            handled=enquiry.handled,
        )

    def get_screenshot_response(self, payment_id: int) -> FileResponse:
        payment = self.db.get(Payment, payment_id)
        if payment is None or not payment.screenshot_path:
            raise NotFoundError("Screenshot not found")

        file_path = Path(payment.screenshot_path).resolve()
        upload_dir = Path(self.settings.upload_dir).resolve()

        # Prevent directory traversal: verify file_path is inside upload_dir
        if not str(file_path).startswith(str(upload_dir)):
            raise BadRequestError("Invalid file path", error_code="INVALID_PATH")

        if not file_path.exists() or not file_path.is_file():
            raise NotFoundError("Screenshot file missing on disk")

        ext = file_path.suffix.lower()
        content_type = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
        }.get(ext, "application/octet-stream")

        return FileResponse(file_path, media_type=content_type, filename=file_path.name)

    # ---------------- 6. USER MANAGEMENT & PROTECTION ----------------

    def update_user(self, target_user_id: int, data: UserUpdate, user: User, ip: str | None) -> User:
        target_user = self.db.get(User, target_user_id)
        if target_user is None:
            raise NotFoundError(f"User {target_user_id} not found")

        changes = drop_nulls(data.model_dump(exclude_unset=True))
        if getattr(target_user, "is_protected", False):
            action = "update"
            if changes.get("is_active") is False:
                action = "deactivate"
            elif "role" in changes:
                action = "role"
            elif "email" in changes:
                action = "email"
            elif "is_protected" in changes:
                action = "is_protected"
            elif "is_verified" in changes:
                action = "is_verified"
            assert_user_not_protected(target_user, action, actor=user, db=self.db, ip=ip, details={"changes": list(changes.keys())})

        for field, value in changes.items():
            if field == "is_verified":
                from datetime import datetime, timezone
                target_user.email_verified_at = datetime.now(timezone.utc) if value else None
            else:
                setattr(target_user, field, value)

        action_name = "admin.user.deactivate" if changes.get("is_active") is False else "admin.user.update"
        record_audit(
            self.db,
            action=action_name,
            user_id=user.id,
            client_id=target_user.client_id,
            entity_type="user",
            entity_id=target_user.id,
            ip_address=ip,
            level="info",
            message=f"Super Admin updated user {target_user.email}",
            details={"fields": sorted(changes)},
        )
        self.db.commit()
        self.db.refresh(target_user)
        return target_user

    def delete_user(self, target_user_id: int, user: User, ip: str | None) -> None:
        target_user = self.db.get(User, target_user_id)
        if target_user is None:
            raise NotFoundError(f"User {target_user_id} not found")

        if getattr(target_user, "is_protected", False):
            assert_user_not_protected(target_user, "delete", actor=user, db=self.db, ip=ip)

        self.db.delete(target_user)
        record_audit(
            self.db,
            action="admin.user.delete",
            user_id=user.id,
            client_id=target_user.client_id,
            entity_type="user",
            entity_id=target_user.id,
            ip_address=ip,
            level="warn",
            message=f"Super Admin deleted user {target_user.email}",
        )
        self.db.commit()

    def reset_user_password(self, target_user_id: int, new_password: str, user: User, ip: str | None) -> None:
        target_user = self.db.get(User, target_user_id)
        if target_user is None:
            raise NotFoundError(f"User {target_user_id} not found")

        if getattr(target_user, "is_protected", False):
            assert_user_not_protected(
                target_user,
                "reset_password",
                actor=user,
                db=self.db,
                ip=ip,
                details={"admin_id": user.id},
            )

        target_user.password_hash = hash_password(new_password)
        record_audit(
            self.db,
            action="admin.user.reset_password",
            user_id=user.id,
            client_id=target_user.client_id,
            entity_type="user",
            entity_id=target_user.id,
            ip_address=ip,
            level="warn",
            message=f"Super Admin reset password for {target_user.email}",
        )
        self.db.commit()
