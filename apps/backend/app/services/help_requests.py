from __future__ import annotations

import re
import uuid
from html import unescape
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from fastapi import UploadFile
import bleach
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.phone import InvalidPhoneError, normalize_ng_phone
from app.models import (
    AuditLog,
    HelpRequest,
    HelpRequestStatus,
    MediaAsset,
    MediaKind,
    OPEN_HELP_REQUEST_STATUSES,
    User,
    VerificationType,
    Visibility,
)
from app.services.settings import get_setting_value
from app.services.notifications import notify_request_approved

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024
_NIN_RE = re.compile(r"^\d{11}$")
_DANGEROUS_HTML_BLOCK_RE = re.compile(
    r"<(script|style|iframe|object|embed)\b[^>]*>.*?</\1\s*>",
    flags=re.IGNORECASE | re.DOTALL,
)
STORY_TAGS = {
    "p",
    "br",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h2",
    "h3",
}


class HelpRequestError(ValueError):
    pass


def media_url(asset: MediaAsset | None) -> str | None:
    if asset is None:
        return None
    return f"/media/{Path(asset.path).name}"


def serialize_help_request(row: HelpRequest, *, include_private: bool = False) -> dict:
    safe_story = sanitize_story(row.story)
    data = {
        "id": str(row.id),
        "full_name": row.full_name,
        "story": safe_story,
        "story_plain": story_plain_text(safe_story),
        "goal_ngn": float(row.goal_ngn),
        "raised_ngn": float(row.raised_ngn),
        "deadline_days": row.deadline_days,
        "deadline_at": row.deadline_at.isoformat() if row.deadline_at else None,
        "status": row.status,
        "visibility": row.visibility,
        "verification_type": row.verification_type,
        "photo_url": media_url(row.photo),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
    }
    if include_private:
        data.update(
            {
                "user_id": str(row.user_id),
                "verification_nin": row.verification_nin,
                "verification_phone": row.verification_phone,
                "bank_code": row.bank_code,
                "account_number": row.account_number,
                "account_name": row.account_name,
            }
        )
    return data


def sanitize_story(value: str) -> str:
    """Keep editor formatting while removing scripts, links, and attributes."""
    without_dangerous_blocks = _DANGEROUS_HTML_BLOCK_RE.sub("", value)
    return bleach.clean(
        without_dangerous_blocks.strip(),
        tags=STORY_TAGS,
        attributes={},
        protocols=set(),
        strip=True,
    )


def story_plain_text(value: str) -> str:
    plain = bleach.clean(value, tags=set(), attributes={}, strip=True)
    return re.sub(r"\s+", " ", unescape(plain)).strip()


def _default_deadline_days(db: Session) -> int:
    value = get_setting_value(db, "default_deadline_days", 30)
    try:
        days = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        days = 30
    return days if days in {14, 30, 60} else 30


def assert_can_create(db: Session, user: User) -> None:
    if bool(get_setting_value(db, "maintenance_mode", False)):
        raise HelpRequestError("Maintenance mode is on. Creating requests is temporarily disabled.")

    open_statuses = [status.value for status in OPEN_HELP_REQUEST_STATUSES]
    existing = db.scalar(
        select(HelpRequest).where(
            HelpRequest.user_id == user.id,
            HelpRequest.status.in_(open_statuses),
        )
    )
    if existing is not None:
        raise HelpRequestError("You already have an open help request.")


async def save_photo(db: Session, *, user: User, photo: UploadFile) -> MediaAsset:
    content_type = (photo.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HelpRequestError("Photo must be JPEG, PNG, or WebP")

    data = await photo.read()
    if not data:
        raise HelpRequestError("Photo file is empty")
    if len(data) > MAX_PHOTO_BYTES:
        raise HelpRequestError("Photo must be 5MB or smaller")

    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = upload_root / filename
    dest.write_bytes(data)

    asset = MediaAsset(
        owner_user_id=user.id,
        path=filename,
        content_type=content_type,
        kind=MediaKind.PHOTO.value,
        original_filename=photo.filename,
    )
    db.add(asset)
    db.flush()
    return asset


def create_help_request(
    db: Session,
    *,
    user: User,
    full_name: str,
    story: str,
    goal_ngn: str,
    deadline_days: int | None,
    verification_type: str,
    verification_nin: str | None,
    verification_phone: str | None,
    bank_code: str | None,
    account_number: str | None,
    account_name: str | None,
    photo: MediaAsset | None,
) -> HelpRequest:
    assert_can_create(db, user)

    name = full_name.strip()
    body = sanitize_story(story)
    plain_body = story_plain_text(body)
    if len(name) < 2 or len(name) > 200:
        raise HelpRequestError("Full name must be 2–200 characters")
    if len(plain_body) < 40:
        raise HelpRequestError("Please share a bit more of your story (at least 40 characters)")
    if len(plain_body) > 5000:
        raise HelpRequestError("Story is too long")

    try:
        goal = Decimal(str(goal_ngn).strip())
    except (InvalidOperation, ValueError) as exc:
        raise HelpRequestError("Goal amount must be a number") from exc
    if goal <= 0:
        raise HelpRequestError("Goal amount must be greater than 0")
    if goal > Decimal("100000000"):
        raise HelpRequestError("Goal amount is too large")

    days = deadline_days if deadline_days is not None else _default_deadline_days(db)
    if days not in {14, 30, 60}:
        raise HelpRequestError("Deadline must be 14, 30, or 60 days")

    vtype = verification_type.strip().lower()
    if vtype not in {VerificationType.NIN.value, VerificationType.PHONE.value}:
        raise HelpRequestError("Verification must be nin or phone")

    nin_value = None
    phone_value = None
    if vtype == VerificationType.NIN.value:
        nin_value = (verification_nin or "").strip()
        if not _NIN_RE.match(nin_value):
            raise HelpRequestError("NIN must be an 11-digit number")
    else:
        try:
            phone_value = normalize_ng_phone(verification_phone or user.phone)
        except InvalidPhoneError as exc:
            raise HelpRequestError(str(exc)) from exc

    row = HelpRequest(
        user_id=user.id,
        full_name=name,
        story=body,
        goal_ngn=goal,
        raised_ngn=Decimal("0.00"),
        deadline_days=days,
        status=HelpRequestStatus.PENDING_REVIEW.value,
        visibility=Visibility.PRIVATE.value,
        verification_type=vtype,
        verification_nin=nin_value,
        verification_phone=phone_value,
        photo_asset_id=photo.id if photo else None,
        bank_code=(bank_code or "").strip() or None,
        account_number=(account_number or "").strip() or None,
        account_name=(account_name or "").strip() or None,
    )
    db.add(row)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="help_request_create",
            entity_type="help_request",
            entity_id=str(row.id),
            payload={"status": row.status},
        )
    )
    db.commit()
    return get_help_request(db, row.id)


def get_help_request(db: Session, request_id: uuid.UUID) -> HelpRequest | None:
    return db.scalar(
        select(HelpRequest)
        .options(selectinload(HelpRequest.photo))
        .where(HelpRequest.id == request_id)
    )


def list_live_requests(db: Session, *, limit: int = 50) -> list[HelpRequest]:
    return list(
        db.scalars(
            select(HelpRequest)
            .options(selectinload(HelpRequest.photo))
            .where(
                HelpRequest.status == HelpRequestStatus.LIVE.value,
                HelpRequest.visibility == Visibility.PUBLIC.value,
            )
            .order_by(HelpRequest.created_at.desc())
            .limit(limit)
        ).all()
    )


def list_mine(db: Session, user: User) -> list[HelpRequest]:
    return list(
        db.scalars(
            select(HelpRequest)
            .options(selectinload(HelpRequest.photo))
            .where(HelpRequest.user_id == user.id)
            .order_by(HelpRequest.created_at.desc())
        ).all()
    )


def list_admin_requests(db: Session, *, status: str | None = None, limit: int = 100) -> list[HelpRequest]:
    stmt = select(HelpRequest).options(selectinload(HelpRequest.photo)).order_by(HelpRequest.created_at.desc())
    if status:
        stmt = stmt.where(HelpRequest.status == status)
    return list(db.scalars(stmt.limit(limit)).all())


def update_bank_details(
    db: Session,
    *,
    row: HelpRequest,
    user: User,
    bank_code: str,
    account_number: str,
    account_name: str,
) -> HelpRequest:
    if row.user_id != user.id:
        raise HelpRequestError("Help request not found")
    bank = bank_code.strip()
    number = account_number.strip()
    name = account_name.strip()
    if not bank or len(bank) > 16:
        raise HelpRequestError("Enter a valid bank code")
    if not number.isdigit() or not 10 <= len(number) <= 16:
        raise HelpRequestError("Enter a valid account number")
    if len(name) < 2 or len(name) > 200:
        raise HelpRequestError("Enter the account holder name")

    row.bank_code = bank
    row.account_number = number
    row.account_name = name
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="help_request_bank_update",
            entity_type="help_request",
            entity_id=str(row.id),
            payload={"bank_code": bank, "account_name": name},
        )
    )
    db.commit()
    return get_help_request(db, row.id)  # type: ignore[return-value]


def approve_request(db: Session, *, row: HelpRequest, admin: User) -> HelpRequest:
    if row.status != HelpRequestStatus.PENDING_REVIEW.value:
        raise HelpRequestError("Only pending requests can be approved")
    if not row.bank_code or not row.account_number or not row.account_name:
        raise HelpRequestError("Requester must add payout bank details before approval")

    now = datetime.now(timezone.utc)
    row.status = HelpRequestStatus.LIVE.value
    row.visibility = Visibility.PUBLIC.value
    row.deadline_at = now + timedelta(days=row.deadline_days)
    row.reviewed_by_id = admin.id
    row.reviewed_at = now
    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action="help_request_approve",
            entity_type="help_request",
            entity_id=str(row.id),
            payload={"deadline_at": row.deadline_at.isoformat()},
        )
    )
    db.commit()
    updated = get_help_request(db, row.id)
    if updated is not None:
        notify_request_approved(db, updated)
    return updated  # type: ignore[return-value]


def reject_request(db: Session, *, row: HelpRequest, admin: User, reason: str | None) -> HelpRequest:
    if row.status != HelpRequestStatus.PENDING_REVIEW.value:
        raise HelpRequestError("Only pending requests can be rejected")

    now = datetime.now(timezone.utc)
    row.status = HelpRequestStatus.REJECTED.value
    row.visibility = Visibility.PRIVATE.value
    row.reviewed_by_id = admin.id
    row.reviewed_at = now
    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action="help_request_reject",
            entity_type="help_request",
            entity_id=str(row.id),
            payload={"reason": (reason or "").strip() or None},
        )
    )
    db.commit()
    return get_help_request(db, row.id)  # type: ignore[return-value]
