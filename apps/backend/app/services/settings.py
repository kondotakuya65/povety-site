from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppSetting, AuditLog, User

PUBLIC_SETTING_KEYS = (
    "platform_fee_percent",
    "min_donation_ngn",
    "whatsapp_follow_url",
    "support_email",
    "site_tagline",
    "maintenance_mode",
)

WEEKDAY_LABELS = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)


@dataclass(frozen=True)
class SettingMeta:
    key: str
    label: str
    description: str
    value_type: str


SETTING_META: dict[str, SettingMeta] = {
    "platform_fee_percent": SettingMeta(
        key="platform_fee_percent",
        label="Platform fee (%)",
        description="Prosperax fee taken from each donation toward the requester. 0–20.",
        value_type="number",
    ),
    "default_deadline_days": SettingMeta(
        key="default_deadline_days",
        label="Default request deadline (days)",
        description="Default length when a request goes live. Must be 14, 30, or 60.",
        value_type="number",
    ),
    "donor_refund_days": SettingMeta(
        key="donor_refund_days",
        label="Donor refund window (days)",
        description="Days after payment a donor can request a refund while funds are still held.",
        value_type="number",
    ),
    "unmet_goal_refund_business_days": SettingMeta(
        key="unmet_goal_refund_business_days",
        label="Unmet-goal refund delay (business days)",
        description="Business days after deadline before auto-refunding an unmet goal.",
        value_type="number",
    ),
    "min_donation_ngn": SettingMeta(
        key="min_donation_ngn",
        label="Minimum donation (NGN)",
        description="Smallest donation amount accepted at checkout.",
        value_type="number",
    ),
    "whatsapp_follow_url": SettingMeta(
        key="whatsapp_follow_url",
        label="WhatsApp follow URL",
        description="Homepage WhatsApp CTA link (channel or community).",
        value_type="string",
    ),
    "support_email": SettingMeta(
        key="support_email",
        label="Support inbox email",
        description="Where contact-form messages are emailed. Leave blank to use ADMIN_EMAIL.",
        value_type="string",
    ),
    "site_tagline": SettingMeta(
        key="site_tagline",
        label="Site tagline",
        description="Short brand line shown on the homepage.",
        value_type="string",
    ),
    "payout_weekday": SettingMeta(
        key="payout_weekday",
        label="Weekly payout day",
        description="0 = Monday … 6 = Sunday.",
        value_type="number",
    ),
    "maintenance_mode": SettingMeta(
        key="maintenance_mode",
        label="Maintenance mode",
        description="When on, soft-locks donate/create flows.",
        value_type="boolean",
    ),
}


def coerce_setting_value(value_type: str, raw: str) -> str | int | float | bool:
    if value_type == "boolean":
        return raw.strip().lower() in {"1", "true", "yes", "on"}
    if value_type == "number":
        text = raw.strip()
        if "." in text:
            return float(text)
        return int(text)
    return raw


def serialize_setting(row: AppSetting) -> dict:
    meta = SETTING_META.get(row.key)
    return {
        "key": row.key,
        "value": coerce_setting_value(row.value_type, row.value),
        "raw_value": row.value,
        "value_type": row.value_type,
        "label": meta.label if meta else row.key,
        "description": meta.description if meta else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def get_settings_map(db: Session) -> dict[str, AppSetting]:
    rows = db.scalars(select(AppSetting)).all()
    return {row.key: row for row in rows}


def get_setting_value(db: Session, key: str, default: object | None = None) -> object | None:
    row = db.get(AppSetting, key)
    if row is None:
        return default
    return coerce_setting_value(row.value_type, row.value)


def get_public_settings(db: Session) -> dict:
    settings_map = get_settings_map(db)
    out: dict = {}
    for key in PUBLIC_SETTING_KEYS:
        row = settings_map.get(key)
        if row is None:
            continue
        out[key] = coerce_setting_value(row.value_type, row.value)
    return out


def validate_and_normalize(key: str, raw_value: object) -> tuple[str, str]:
    meta = SETTING_META.get(key)
    if meta is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown setting: {key}")

    if meta.value_type == "boolean":
        if isinstance(raw_value, bool):
            normalized = "true" if raw_value else "false"
        else:
            text = str(raw_value).strip().lower()
            if text not in {"true", "false", "1", "0", "yes", "no", "on", "off"}:
                raise HTTPException(status_code=400, detail=f"{key} must be true or false")
            normalized = "true" if text in {"true", "1", "yes", "on"} else "false"
        return normalized, meta.value_type

    if meta.value_type == "number":
        try:
            number = Decimal(str(raw_value).strip())
        except (InvalidOperation, ValueError):
            raise HTTPException(status_code=400, detail=f"{key} must be a number") from None

        if key == "platform_fee_percent":
            if number < 0 or number > 20:
                raise HTTPException(status_code=400, detail="platform_fee_percent must be between 0 and 20")
            return format(number.quantize(Decimal("0.01")), "f"), meta.value_type

        if key == "default_deadline_days":
            if int(number) not in {14, 30, 60}:
                raise HTTPException(status_code=400, detail="default_deadline_days must be 14, 30, or 60")
            return str(int(number)), meta.value_type

        if key == "donor_refund_days":
            if number < 1 or number > 30:
                raise HTTPException(status_code=400, detail="donor_refund_days must be between 1 and 30")
            return str(int(number)), meta.value_type

        if key == "unmet_goal_refund_business_days":
            if number < 1 or number > 14:
                raise HTTPException(status_code=400, detail="unmet_goal_refund_business_days must be between 1 and 14")
            return str(int(number)), meta.value_type

        if key == "min_donation_ngn":
            if number < 100 or number > 1_000_000:
                raise HTTPException(status_code=400, detail="min_donation_ngn must be between 100 and 1000000")
            return str(int(number)), meta.value_type

        if key == "payout_weekday":
            if int(number) not in range(7):
                raise HTTPException(status_code=400, detail="payout_weekday must be 0–6 (Mon–Sun)")
            return str(int(number)), meta.value_type

        return format(number, "f"), meta.value_type

    text = str(raw_value).strip()
    if key == "site_tagline":
        if not text or len(text) > 160:
            raise HTTPException(status_code=400, detail="site_tagline must be 1–160 characters")
        return text, meta.value_type

    if key == "whatsapp_follow_url":
        if text and not (text.startswith("https://") or text.startswith("http://")):
            raise HTTPException(status_code=400, detail="whatsapp_follow_url must start with http:// or https://")
        if len(text) > 500:
            raise HTTPException(status_code=400, detail="whatsapp_follow_url is too long")
        return text, meta.value_type

    if key == "support_email":
        if text and ("@" not in text or len(text) > 255):
            raise HTTPException(status_code=400, detail="support_email must be a valid email or blank")
        return text.lower(), meta.value_type

    return text, meta.value_type


def update_settings(db: Session, *, updates: dict[str, object], admin: User) -> list[AppSetting]:
    if not updates:
        raise HTTPException(status_code=400, detail="No settings provided")

    unknown = [key for key in updates if key not in SETTING_META]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown settings: {', '.join(unknown)}")

    changed: list[dict] = []
    rows: list[AppSetting] = []
    for key, raw_value in updates.items():
        normalized, value_type = validate_and_normalize(key, raw_value)
        row = db.get(AppSetting, key)
        if row is None:
            row = AppSetting(key=key, value=normalized, value_type=value_type)
            db.add(row)
        else:
            if row.value == normalized:
                rows.append(row)
                continue
            row.value = normalized
            row.value_type = value_type
        row.updated_by_id = admin.id
        rows.append(row)
        changed.append({"key": key, "value": normalized})

    if changed:
        db.add(
            AuditLog(
                actor_user_id=admin.id,
                action="settings_update",
                entity_type="app_settings",
                entity_id=None,
                payload={"changes": changed},
            )
        )
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
