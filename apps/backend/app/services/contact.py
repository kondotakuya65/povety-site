from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_log import AuditLog
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.services.notifications import notify_contact_message
from app.services.settings import get_setting_value

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOPICS = ("general", "request", "donation", "account", "other")
TOPIC_LABELS = {
    "general": "General",
    "request": "Help request",
    "donation": "Gift or refund",
    "account": "Account",
    "other": "Other",
}


class ContactError(ValueError):
    pass


def serialize_contact_message(row: ContactMessage) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "topic": row.topic,
        "topic_label": TOPIC_LABELS.get(row.topic, row.topic),
        "body": row.body,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def create_contact_message(
    db: Session,
    *,
    name: str,
    email: str,
    phone: str | None,
    topic: str,
    body: str,
) -> ContactMessage:
    cleaned_name = " ".join((name or "").split()).strip()
    cleaned_email = (email or "").strip().lower()
    cleaned_phone = (phone or "").strip() or None
    cleaned_topic = (topic or "general").strip().lower()
    cleaned_body = (body or "").strip()

    if len(cleaned_name) < 2 or len(cleaned_name) > 120:
        raise ContactError("Please enter your name")
    if not _EMAIL_RE.match(cleaned_email) or len(cleaned_email) > 255:
        raise ContactError("Please enter a valid email")
    if cleaned_phone and len(cleaned_phone) > 32:
        raise ContactError("Phone number is too long")
    if cleaned_topic not in TOPICS:
        raise ContactError("Please choose a topic")
    if len(cleaned_body) < 10 or len(cleaned_body) > 2000:
        raise ContactError("Message must be between 10 and 2000 characters")

    recent = db.scalar(
        select(func.count())
        .select_from(ContactMessage)
        .where(
            ContactMessage.email == cleaned_email,
            ContactMessage.created_at >= datetime.now(timezone.utc) - timedelta(minutes=2),
        )
    )
    if int(recent or 0) > 0:
        raise ContactError("Please wait a moment before sending another message")

    row = ContactMessage(
        name=cleaned_name,
        email=cleaned_email,
        phone=cleaned_phone,
        topic=cleaned_topic,
        body=cleaned_body,
        status="new",
    )
    db.add(row)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=None,
            action="contact_message_create",
            entity_type="contact_message",
            entity_id=str(row.id),
            payload={"email": cleaned_email, "topic": cleaned_topic},
        )
    )
    db.commit()
    db.refresh(row)
    notify_contact_message(db, row)
    return row


def list_contact_messages(
    db: Session, *, status: str | None = None, limit: int = 100
) -> list[ContactMessage]:
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(ContactMessage.status == status)
    return list(db.scalars(stmt).all())


def mark_contact_message(
    db: Session, *, row: ContactMessage, status: str, admin: User
) -> ContactMessage:
    if status not in {"new", "read"}:
        raise ContactError("Invalid status")
    row.status = status
    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action="contact_message_update",
            entity_type="contact_message",
            entity_id=str(row.id),
            payload={"status": status},
        )
    )
    db.commit()
    db.refresh(row)
    return row


def count_new_contact_messages(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "new")
        )
        or 0
    )


def get_contact_message(db: Session, message_id: uuid.UUID) -> ContactMessage | None:
    return db.get(ContactMessage, message_id)


def support_inbox_email(db: Session) -> str:
    configured = get_setting_value(db, "support_email", default="")
    if isinstance(configured, str) and "@" in configured:
        return configured.strip().lower()
    return settings.admin_email.strip().lower()
