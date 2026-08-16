from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailError(RuntimeError):
    pass


def _parse_from(value: str) -> tuple[str, str]:
    name, addr = parseaddr(value)
    if not addr:
        return "", value.strip()
    return name, addr


def send_email(
    *,
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    """Send email via SMTP, or log to console when mail is not configured."""
    recipient = (to or "").strip().lower()
    if not recipient or "@" not in recipient:
        raise EmailError("Recipient email is missing")

    if settings.mail_is_console:
        logger.info(
            "EMAIL console to=%s subject=%s\n%s",
            recipient,
            subject,
            text_body,
        )
        print(
            f"\n===== Prosperax email (console) =====\n"
            f"To: {recipient}\n"
            f"Subject: {subject}\n\n"
            f"{text_body}\n"
            f"===== end email =====\n",
            flush=True,
        )
        return

    if not settings.smtp_host.strip():
        raise EmailError("SMTP_HOST is not configured")

    message = EmailMessage()
    from_name, from_addr = _parse_from(settings.mail_from)
    message["Subject"] = subject
    message["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    message["To"] = recipient
    if settings.mail_reply_to.strip():
        message["Reply-To"] = settings.mail_reply_to.strip()
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
                if settings.smtp_username:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                if settings.smtp_username:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
    except Exception as exc:  # noqa: BLE001 - surface as EmailError
        raise EmailError(str(exc)) from exc


def safe_send_email(
    *,
    to: str | None,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> bool:
    """Best-effort send; never raises. Returns True if accepted/logged."""
    if not to:
        logger.info("Skip email %r — no recipient", subject)
        return False
    try:
        send_email(to=to, subject=subject, text_body=text_body, html_body=html_body)
        return True
    except Exception:  # noqa: BLE001
        logger.exception("Failed to send email %r to %s", subject, to)
        return False
