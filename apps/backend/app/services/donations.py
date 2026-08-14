from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import (
    AuditLog,
    Donation,
    DonationStatus,
    HelpRequest,
    HelpRequestStatus,
    User,
    Visibility,
)
from app.services.paystack import PaystackError, initialize_transaction, verify_transaction
from app.services.settings import get_setting_value


class DonationError(ValueError):
    pass


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def serialize_donation(row: Donation, *, include_private: bool = False) -> dict:
    data = {
        "id": str(row.id),
        "help_request_id": str(row.help_request_id),
        "gross_amount": float(row.gross_amount),
        "platform_fee_amount": float(row.platform_fee_amount),
        "net_to_request": float(row.net_to_request),
        "fee_percent_snapshot": float(row.fee_percent_snapshot),
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if include_private:
        data.update(
            {
                "paystack_reference": row.paystack_reference,
                "donor_user_id": str(row.donor_user_id) if row.donor_user_id else None,
            }
        )
    return data


def serialize_supporter(row: Donation) -> dict:
    return {
        "net_to_request": float(row.net_to_request),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "label": "Supporter",
    }


def compute_fee_split(gross: Decimal, fee_percent: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    fee_percent = _money(fee_percent)
    if fee_percent < 0 or fee_percent > 20:
        raise DonationError("Invalid platform fee setting")
    fee_amount = _money(gross * fee_percent / Decimal("100"))
    net = _money(gross - fee_amount)
    if net < 0:
        raise DonationError("Fee exceeds donation amount")
    return fee_percent, fee_amount, net


def initialize_donation(
    db: Session,
    *,
    user: User,
    help_request_id: uuid.UUID,
    amount: str | float | Decimal,
    email: str | None,
) -> dict:
    if bool(get_setting_value(db, "maintenance_mode", False)):
        raise DonationError("Maintenance mode is on. Donations are temporarily disabled.")

    row = db.scalar(
        select(HelpRequest).where(
            HelpRequest.id == help_request_id,
            HelpRequest.status == HelpRequestStatus.LIVE.value,
            HelpRequest.visibility == Visibility.PUBLIC.value,
        )
    )
    if row is None:
        raise DonationError("Live help request not found")

    try:
        gross = _money(Decimal(str(amount)))
    except (InvalidOperation, ValueError) as exc:
        raise DonationError("Enter a valid donation amount") from exc

    min_donation = Decimal(str(get_setting_value(db, "min_donation_ngn", 500) or 500))
    if gross < min_donation:
        raise DonationError(f"Minimum donation is ₦{min_donation}")

    fee_percent_raw = Decimal(str(get_setting_value(db, "platform_fee_percent", 0) or 0))
    fee_percent, fee_amount, net = compute_fee_split(gross, fee_percent_raw)

    donor_email = (email or user.email or "").strip().lower()
    if not donor_email or "@" not in donor_email:
        raise DonationError("Add an email on your account (or provide one) for the payment receipt")

    reference = f"px_{secrets.token_hex(12)}"
    donation = Donation(
        help_request_id=row.id,
        donor_user_id=user.id,
        gross_amount=gross,
        platform_fee_amount=fee_amount,
        net_to_request=net,
        fee_percent_snapshot=fee_percent,
        status=DonationStatus.PENDING.value,
        paystack_reference=reference,
    )
    db.add(donation)
    db.flush()

    callback_url = f"{settings.frontend_url}/donate/callback"
    try:
        paystack = initialize_transaction(
            email=donor_email,
            amount_kobo=int(gross * 100),
            reference=reference,
            callback_url=callback_url,
            metadata={
                "donation_id": str(donation.id),
                "help_request_id": str(row.id),
                "net_to_request": str(net),
            },
        )
    except PaystackError as exc:
        db.rollback()
        raise DonationError(str(exc)) from exc

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="donation_initialize",
            entity_type="donation",
            entity_id=str(donation.id),
            payload={"reference": reference, "gross": str(gross), "net": str(net)},
        )
    )
    db.commit()
    db.refresh(donation)

    return {
        "donation": serialize_donation(donation, include_private=True),
        "authorization_url": paystack["authorization_url"],
        "reference": reference,
        "public_key": settings.paystack_public_key,
        "mock": settings.paystack_is_mock,
        "fee": {
            "platform_fee_percent": float(fee_percent),
            "platform_fee_amount": float(fee_amount),
            "net_to_request": float(net),
            "gross_amount": float(gross),
        },
    }


def mark_donation_held(db: Session, donation: Donation) -> Donation:
    if donation.status == DonationStatus.HELD.value:
        return donation
    if donation.status != DonationStatus.PENDING.value:
        raise DonationError(f"Cannot hold donation in status {donation.status}")

    help_request = db.scalar(select(HelpRequest).where(HelpRequest.id == donation.help_request_id))
    if help_request is None:
        raise DonationError("Help request missing for donation")

    donation.status = DonationStatus.HELD.value
    help_request.raised_ngn = _money(Decimal(help_request.raised_ngn) + Decimal(donation.net_to_request))

    if help_request.raised_ngn >= help_request.goal_ngn:
        help_request.status = HelpRequestStatus.FUNDED.value
        help_request.visibility = Visibility.PRIVATE.value

    db.add(
        AuditLog(
            actor_user_id=donation.donor_user_id,
            action="donation_held",
            entity_type="donation",
            entity_id=str(donation.id),
            payload={
                "reference": donation.paystack_reference,
                "net": str(donation.net_to_request),
                "raised": str(help_request.raised_ngn),
                "request_status": help_request.status,
            },
        )
    )
    db.commit()
    db.refresh(donation)
    return donation


def confirm_donation(db: Session, *, reference: str) -> Donation:
    donation = db.scalar(select(Donation).where(Donation.paystack_reference == reference))
    if donation is None:
        raise DonationError("Donation not found")
    if donation.status == DonationStatus.HELD.value:
        return donation

    if settings.paystack_is_mock:
        return mark_donation_held(db, donation)

    try:
        data = verify_transaction(reference)
    except PaystackError as exc:
        raise DonationError(str(exc)) from exc

    if data.get("status") != "success":
        raise DonationError("Payment not successful yet")

    paid_kobo = int(data.get("amount") or 0)
    expected_kobo = int(Decimal(donation.gross_amount) * 100)
    if paid_kobo != expected_kobo:
        raise DonationError("Paid amount does not match donation")

    return mark_donation_held(db, donation)


def list_my_donations(db: Session, user: User) -> list[Donation]:
    return list(
        db.scalars(
            select(Donation)
            .options(selectinload(Donation.help_request))
            .where(Donation.donor_user_id == user.id)
            .order_by(Donation.created_at.desc())
        ).all()
    )


def list_supporters(db: Session, help_request_id: uuid.UUID, *, limit: int = 20) -> list[Donation]:
    return list(
        db.scalars(
            select(Donation)
            .where(
                Donation.help_request_id == help_request_id,
                Donation.status.in_(
                    [
                        DonationStatus.HELD.value,
                        DonationStatus.PAID_OUT.value,
                    ]
                ),
            )
            .order_by(Donation.created_at.desc())
            .limit(limit)
        ).all()
    )


def get_donation_by_reference(db: Session, reference: str) -> Donation | None:
    return db.scalar(select(Donation).where(Donation.paystack_reference == reference))
