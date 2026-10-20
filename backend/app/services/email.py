import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_password_reset(to_email: str, reset_link: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        if settings.environment == "development":
            # Development convenience only; never enabled in production.
            print(f"\n[DEV ONLY] Password reset link: {reset_link}\n", flush=True)
        else:
            logger.warning("Password reset requested but SMTP is not configured")
        return
    message = EmailMessage()
    message["Subject"] = "Reset your password"
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message.set_content(
        f"A password reset was requested for your {settings.app_name} account.\n\n"
        f"Reset your password: {reset_link}\n\n"
        f"This link expires in {settings.password_reset_token_minutes} minutes. "
        "If you did not request this, you can ignore this email."
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        logger.error("Failed to send password reset email: %s", type(exc).__name__)
