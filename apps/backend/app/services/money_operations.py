from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AuditLog,
    Donation,
    DonationStatus,
    HelpRequest,
    HelpRequestStatus,
    Payout,
    PayoutBatch,
    PayoutBatchStatus,
    PayoutStatus,
    Refund,
    RefundReason,
    RefundStatus,
    User,
    Visibility,
)
from app.services.paystack import (
    PaystackError,
    create_refund,
    create_transfer_recipient,
    initiate_transfer,
)
from app.services.settings import get_setting_value


class MoneyOperationError(ValueError):
    pass


def serialize_payout(row: Payout) -> dict:
    return {
        "id": str(row.id),
        "batch_id": str(row.batch_id),
        "help_request_id": str(row.help_request_id),
        "amount": float(row.amount),
        "status": row.status,
        "paystack_reference": row.paystack_reference,
        "paystack_transfer_code": row.paystack_transfer_code,
        "recipient_account_name": row.recipient_account_name,
        "failure_reason": row.failure_reason,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def serialize_batch(row: PayoutBatch) -> dict:
    return {
        "id": str(row.id),
        "status": row.status,
        "notes": row.notes,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
        "payouts": [serialize_payout(item) for item in row.payouts],
    }


def serialize_refund(row: Refund) -> dict:
    return {
        "id": str(row.id),
        "donation_id": str(row.donation_id),
        "amount": float(row.amount),
        "reason": row.reason,
        "status": row.status,
        "paystack_refund_reference": row.paystack_refund_reference,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _eligible_funded_requests(db: Session) -> list[HelpRequest]:
    return list(
        db.scalars(
            select(HelpRequest)
            .where(HelpRequest.status == HelpRequestStatus.FUNDED.value)
            .order_by(HelpRequest.updated_at.asc())
        ).all()
    )


def _held_donations(db: Session, help_request_id: uuid.UUID) -> list[Donation]:
    return list(
        db.scalars(
            select(Donation)
            .where(
                Donation.help_request_id == help_request_id,
                Donation.status == DonationStatus.HELD.value,
                Donation.payout_id.is_(None),
            )
            .order_by(Donation.created_at.asc())
        ).all()
    )


def run_weekly_payouts(db: Session, *, admin: User) -> PayoutBatch:
    batch = PayoutBatch(
        status=PayoutBatchStatus.PENDING.value,
        created_by_id=admin.id,
        notes="Weekly payout run",
    )
    db.add(batch)
    db.flush()

    funded = _eligible_funded_requests(db)
    failures = 0
    created = 0
    pending = 0

    for request in funded:
        donations = _held_donations(db, request.id)
        if not donations:
            continue

        missing = [
            label
            for label, value in (
                ("bank code", request.bank_code),
                ("account number", request.account_number),
                ("account name", request.account_name),
            )
            if not value
        ]
        amount = sum((Decimal(item.net_to_request) for item in donations), Decimal("0.00"))
        reference = f"pxp_{secrets.token_hex(12)}"
        payout = Payout(
            batch_id=batch.id,
            help_request_id=request.id,
            amount=amount,
            status=PayoutStatus.PENDING.value,
            paystack_reference=reference,
            recipient_bank_code=request.bank_code,
            recipient_account_number=request.account_number,
            recipient_account_name=request.account_name,
        )
        db.add(payout)
        db.flush()
        for donation in donations:
            donation.payout_id = payout.id
        created += 1

        if missing:
            payout.status = PayoutStatus.FAILED.value
            payout.failure_reason = f"Missing {', '.join(missing)}"
            for donation in donations:
                donation.payout_id = None
            failures += 1
            continue

        try:
            recipient = create_transfer_recipient(
                name=request.account_name or "",
                account_number=request.account_number or "",
                bank_code=request.bank_code or "",
            )
            result = initiate_transfer(
                amount_kobo=int(amount * 100),
                recipient_code=result_code(recipient),
                reference=reference,
                reason=f"Prosperax payout for {request.full_name}",
            )
            payout.paystack_transfer_code = result.get("transfer_code")
            if result.get("status") in {"success", "successful"}:
                payout.status = PayoutStatus.SUCCESS.value
                for donation in donations:
                    donation.status = DonationStatus.PAID_OUT.value
            else:
                # Paystack may initially return pending; webhook/retry completes it.
                payout.status = PayoutStatus.PENDING.value
                pending += 1
        except (PaystackError, MoneyOperationError) as exc:
            payout.status = PayoutStatus.FAILED.value
            payout.failure_reason = str(exc)
            for donation in donations:
                donation.payout_id = None
            failures += 1

    batch.completed_at = datetime.now(timezone.utc)
    if created == 0:
        batch.status = PayoutBatchStatus.COMPLETED.value
        batch.notes = "No eligible funded requests"
    elif failures:
        batch.status = PayoutBatchStatus.FAILED.value
        batch.notes = f"{failures} payout(s) failed"
    elif pending:
        batch.status = PayoutBatchStatus.PENDING.value
        batch.notes = f"{pending} payout(s) awaiting confirmation"
    else:
        batch.status = PayoutBatchStatus.COMPLETED.value

    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action="weekly_payout_run",
            entity_type="payout_batch",
            entity_id=str(batch.id),
            payload={"created": created, "failures": failures},
        )
    )
    db.commit()
    return get_payout_batch(db, batch.id) or batch


def result_code(recipient: dict) -> str:
    code = recipient.get("recipient_code")
    if not code:
        raise MoneyOperationError("Paystack did not return a recipient code")
    return str(code)


def process_refund(db: Session, refund: Refund) -> Refund:
    if refund.status == RefundStatus.SUCCESS.value:
        return refund

    donation = db.scalar(
        select(Donation).where(Donation.id == refund.donation_id).with_for_update()
    )
    if donation is None:
        refund.status = RefundStatus.FAILED.value
        refund.notes = "Donation not found"
        db.commit()
        return refund
    if donation.status == DonationStatus.REFUNDED.value:
        refund.status = RefundStatus.SUCCESS.value
        db.commit()
        return refund
    if donation.status != DonationStatus.HELD.value:
        refund.status = RefundStatus.FAILED.value
        refund.notes = f"Donation is {donation.status}, not held"
        db.commit()
        return refund

    try:
        result = create_refund(
            transaction_reference=donation.paystack_reference,
            amount_kobo=int(Decimal(refund.amount) * 100),
        )
        refund.paystack_refund_reference = str(
            result.get("id") or result.get("reference") or donation.paystack_reference
        )
        if result.get("status") in {"processed", "success", "successful"}:
            _finalize_refund_success(db, refund, donation)
        else:
            refund.status = RefundStatus.PENDING.value
    except PaystackError as exc:
        refund.status = RefundStatus.FAILED.value
        refund.notes = str(exc)

    db.commit()
    db.refresh(refund)
    return refund


def _finalize_refund_success(
    db: Session,
    refund: Refund,
    donation: Donation,
) -> None:
    refund.status = RefundStatus.SUCCESS.value
    if donation.status == DonationStatus.REFUNDED.value:
        return
    donation.status = DonationStatus.REFUNDED.value
    request = db.scalar(
        select(HelpRequest)
        .where(HelpRequest.id == donation.help_request_id)
        .with_for_update()
    )
    if request is None:
        return
    request.raised_ngn = max(
        Decimal("0.00"),
        Decimal(request.raised_ngn) - Decimal(donation.net_to_request),
    )
    if (
        request.status == HelpRequestStatus.FUNDED.value
        and request.raised_ngn < request.goal_ngn
    ):
        now = datetime.now(timezone.utc)
        if request.deadline_at and request.deadline_at <= now:
            request.status = HelpRequestStatus.CLOSED_REFUNDED.value
            request.visibility = Visibility.PRIVATE.value
        else:
            request.status = HelpRequestStatus.LIVE.value
            request.visibility = Visibility.PUBLIC.value


def request_donor_refund(
    db: Session,
    *,
    donation_id: uuid.UUID,
    user: User,
) -> Refund:
    donation = db.scalar(
        select(Donation).where(Donation.id == donation_id).with_for_update()
    )
    if donation is None or donation.donor_user_id != user.id:
        raise MoneyOperationError("Donation not found")
    if donation.status != DonationStatus.HELD.value:
        raise MoneyOperationError("Only held donations can be refunded")

    days = int(get_setting_value(db, "donor_refund_days", 7) or 7)
    now = datetime.now(timezone.utc)
    if donation.created_at + timedelta(days=days) < now:
        raise MoneyOperationError(f"The {days}-day refund window has closed")

    existing = db.scalar(select(Refund).where(Refund.donation_id == donation.id))
    if existing is not None:
        if existing.status == RefundStatus.FAILED.value:
            existing.status = RefundStatus.PENDING.value
            existing.notes = None
            db.commit()
            return process_refund(db, existing)
        return existing

    refund = Refund(
        donation_id=donation.id,
        amount=donation.gross_amount,
        reason=RefundReason.DONOR_REQUESTED.value,
        status=RefundStatus.PENDING.value,
        requested_by_id=user.id,
    )
    db.add(refund)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="donor_refund_request",
            entity_type="refund",
            entity_id=str(refund.id),
            payload={"donation_id": str(donation.id)},
        )
    )
    db.commit()
    return process_refund(db, refund)


def _add_business_days(start: datetime, days: int) -> datetime:
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


def sweep_expired_requests(db: Session, *, actor: User | None = None) -> dict:
    now = datetime.now(timezone.utc)
    expired_candidates = list(
        db.scalars(
            select(HelpRequest).where(
                HelpRequest.status == HelpRequestStatus.LIVE.value,
                HelpRequest.deadline_at.is_not(None),
                HelpRequest.deadline_at <= now,
                HelpRequest.raised_ngn < HelpRequest.goal_ngn,
            )
        ).all()
    )
    delay_days = int(
        get_setting_value(db, "unmet_goal_refund_business_days", 3) or 3
    )
    expired = [
        request
        for request in expired_candidates
        if request.deadline_at
        and _add_business_days(request.deadline_at, delay_days) <= now
    ]

    queued = 0
    processed = 0
    failed = 0
    for request in expired:
        request.status = HelpRequestStatus.CLOSED_REFUNDED.value
        request.visibility = Visibility.PRIVATE.value
        donations = _held_donations(db, request.id)
        for donation in donations:
            existing = db.scalar(select(Refund).where(Refund.donation_id == donation.id))
            if existing is None:
                existing = Refund(
                    donation_id=donation.id,
                    amount=donation.gross_amount,
                    reason=RefundReason.UNMET_GOAL.value,
                    status=RefundStatus.PENDING.value,
                    requested_by_id=actor.id if actor else None,
                )
                db.add(existing)
                db.flush()
                queued += 1
            if existing.status != RefundStatus.SUCCESS.value:
                result = process_refund(db, existing)
                if result.status == RefundStatus.SUCCESS.value:
                    processed += 1
                elif result.status == RefundStatus.FAILED.value:
                    failed += 1

    if expired:
        db.add(
            AuditLog(
                actor_user_id=actor.id if actor else None,
                action="deadline_refund_sweep",
                entity_type="help_request",
                entity_id=None,
                payload={
                    "expired_requests": len(expired),
                    "queued": queued,
                    "processed": processed,
                    "failed": failed,
                },
            )
        )
        db.commit()
    return {
        "expired_requests": len(expired),
        "queued": queued,
        "processed": processed,
        "failed": failed,
    }


def retry_refund(db: Session, refund_id: uuid.UUID) -> Refund:
    refund = db.scalar(select(Refund).where(Refund.id == refund_id))
    if refund is None:
        raise MoneyOperationError("Refund not found")
    if refund.status == RefundStatus.SUCCESS.value:
        return refund
    refund.status = RefundStatus.PENDING.value
    refund.notes = None
    db.commit()
    return process_refund(db, refund)


def get_payout_batch(db: Session, batch_id: uuid.UUID) -> PayoutBatch | None:
    return db.scalar(
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )


def list_payout_batches(db: Session, limit: int = 25) -> list[PayoutBatch]:
    return list(
        db.scalars(
            select(PayoutBatch)
            .options(selectinload(PayoutBatch.payouts))
            .order_by(PayoutBatch.started_at.desc())
            .limit(limit)
        ).all()
    )


def list_refunds(db: Session, limit: int = 100) -> list[Refund]:
    return list(
        db.scalars(
            select(Refund).order_by(Refund.created_at.desc()).limit(limit)
        ).all()
    )


def update_transfer_from_webhook(
    db: Session,
    *,
    reference: str,
    successful: bool,
    transfer_code: str | None = None,
    failure_reason: str | None = None,
) -> Payout | None:
    payout = db.scalar(select(Payout).where(Payout.paystack_reference == reference))
    if payout is None:
        return None

    payout.paystack_transfer_code = transfer_code or payout.paystack_transfer_code
    donations = list(
        db.scalars(select(Donation).where(Donation.payout_id == payout.id)).all()
    )
    if successful:
        payout.status = PayoutStatus.SUCCESS.value
        payout.failure_reason = None
        for donation in donations:
            donation.status = DonationStatus.PAID_OUT.value
    else:
        payout.status = PayoutStatus.FAILED.value
        payout.failure_reason = failure_reason or "Paystack transfer failed"
        for donation in donations:
            donation.payout_id = None

    _refresh_batch_status(db, payout.batch_id)
    db.commit()
    return payout


def update_refund_from_webhook(
    db: Session,
    *,
    transaction_reference: str,
    successful: bool,
    refund_reference: str | None = None,
    failure_reason: str | None = None,
) -> Refund | None:
    donation = db.scalar(
        select(Donation).where(
            Donation.paystack_reference == transaction_reference
        )
    )
    if donation is None:
        return None
    refund = db.scalar(select(Refund).where(Refund.donation_id == donation.id))
    if refund is None:
        return None
    refund.paystack_refund_reference = (
        refund_reference or refund.paystack_refund_reference
    )
    if successful:
        _finalize_refund_success(db, refund, donation)
        refund.notes = None
    else:
        refund.status = RefundStatus.FAILED.value
        refund.notes = failure_reason or "Paystack refund failed"
    db.commit()
    return refund


def _refresh_batch_status(db: Session, batch_id: uuid.UUID) -> None:
    batch = db.scalar(
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )
    if batch is None:
        return
    statuses = {item.status for item in batch.payouts}
    if PayoutStatus.FAILED.value in statuses:
        batch.status = PayoutBatchStatus.FAILED.value
    elif PayoutStatus.PENDING.value in statuses:
        batch.status = PayoutBatchStatus.PENDING.value
    else:
        batch.status = PayoutBatchStatus.COMPLETED.value
        batch.completed_at = datetime.now(timezone.utc)
