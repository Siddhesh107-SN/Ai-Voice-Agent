import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import resend

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    pass


class EmailDeliveryError(RuntimeError):
    pass


def warn_if_console_backend_in_production() -> None:
    settings = get_settings()
    if (
        settings.app_env.strip().lower() == "production"
        and settings.email_backend.strip().lower() == "console"
    ):
        logger.warning(
            "EMAIL_BACKEND=console in production; verification and reset emails are not being sent."
        )


class EmailService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def send_verification_email(self, to_email: str, code: str) -> None:
        """Send 6-digit verification code according to configured EMAIL_BACKEND."""
        self.ensure_verification_delivery_configured()
        backend = (self.settings.email_backend or "console").lower().strip()

        if backend == "console":
            logger.info("Verification email suppressed by console backend")
            return

        if backend == "smtp":
            self._send_code_via_smtp(
                to_email, code, "Verify your email address - Talkaor", "verification"
            )
            return

        if backend == "resend":
            self._send_code_via_resend(
                to_email, code, "Verify your email address - Talkaor", "verification"
            )
            return

    def ensure_verification_delivery_configured(self) -> None:
        backend = (self.settings.email_backend or "console").lower().strip()
        if backend == "console":
            if self.settings.app_env.strip().lower() == "production":
                raise EmailConfigurationError("Email verification delivery is not configured")
            return
        if backend == "smtp" and (
            not self.settings.smtp_host.strip() or not self.settings.email_from.strip()
        ):
            raise EmailConfigurationError("Email verification delivery is not configured")
        if backend == "resend" and (
            not self.settings.resend_api_key.strip() or not self.settings.mail_from.strip()
        ):
            raise EmailConfigurationError("Email verification delivery is not configured")
        if backend not in {"smtp", "resend"}:
            raise EmailConfigurationError("Email verification delivery is not configured")

    def ensure_password_reset_delivery_configured(self) -> None:
        backend = (self.settings.email_backend or "console").lower().strip()
        if backend == "console":
            raise EmailConfigurationError("Password reset email delivery is not configured")
        if backend == "smtp" and (
            not self.settings.smtp_host.strip() or not self.settings.email_from.strip()
        ):
            raise EmailConfigurationError("Password reset email delivery is not configured")
        if backend == "resend" and (
            not self.settings.resend_api_key.strip() or not self.settings.mail_from.strip()
        ):
            raise EmailConfigurationError("Password reset email delivery is not configured")
        if backend not in {"smtp", "resend"}:
            raise EmailConfigurationError("Password reset email delivery is not configured")

    def send_password_reset_code(self, to_email: str, code: str) -> None:
        self.ensure_password_reset_delivery_configured()
        backend = (self.settings.email_backend or "").lower().strip()
        subject = "Reset your TalkAor password"
        if backend == "smtp":
            self._send_code_via_smtp(to_email, code, subject, "password reset")
        else:
            self._send_code_via_resend(to_email, code, subject, "password reset")

    def _send_code_via_smtp(
        self, to_email: str, code: str, subject: str, purpose: str
    ) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.settings.email_from
        msg["To"] = to_email

        text_content = (
            f"Hello,\n\n"
            f"Your TalkAor {purpose} code is: {code}\n\n"
            f"This code will expire in 10 minutes.\n"
            f"If you did not request this, please ignore this email.\n"
        )
        html_content = (
            f"<p>Hello,</p>"
            f"<p>Your TalkAor {purpose} code is: <strong>{code}</strong></p>"
            f"<p>This code will expire in 10 minutes.</p>"
            f"<p>If you did not request this, please ignore this email.</p>"
        )

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        host = self.settings.smtp_host
        port = self.settings.smtp_port or 587
        user = self.settings.smtp_user
        password = self.settings.smtp_password

        try:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
            logger.info("Email sent via SMTP to %s", to_email)
        except (OSError, smtplib.SMTPException) as exc:
            logger.error("Email delivery failed via SMTP (%s)", type(exc).__name__)
            raise EmailDeliveryError("Email delivery failed") from exc

    def _send_code_via_resend(
        self, to_email: str, code: str, subject: str, purpose: str
    ) -> None:
        if not self.settings.resend_api_key:
            raise EmailConfigurationError("RESEND_API_KEY is required when EMAIL_BACKEND=resend")

        resend.api_key = self.settings.resend_api_key
        try:
            resend.Emails.send({
                "from": self.settings.mail_from,
                "to": [to_email],
                "subject": subject,
                "html": (
                    "<p>Hello,</p>"
                    f"<p>Your TalkAor {purpose} code is: <strong>{code}</strong></p>"
                    "<p>This code will expire in 10 minutes.</p>"
                    "<p>If you did not request this, please ignore this email.</p>"
                ),
            })
            logger.info("Email sent via Resend to %s", to_email)
        except Exception as exc:
            logger.error("Email delivery failed via Resend (%s)", type(exc).__name__)
            raise EmailDeliveryError("Email delivery failed") from exc
