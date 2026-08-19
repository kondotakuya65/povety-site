from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models import (
    AuditLog,
    Donation,
    DonationStatus,
    HelpRequest,
    HelpRequestStatus,
    Refund,
    User,
)
from app.services.contact import (
    ContactError,
    count_new_contact_messages,
    get_contact_message,
    list_contact_messages,
    mark_contact_message,
    serialize_contact_message,
)
from app.services.help_requests import (
    HelpRequestError,
    approve_request,
    get_help_request,
    list_admin_requests,
    reject_request,
    serialize_help_request,
)
from app.services.money_operations import (
    MoneyOperationError,
    list_payout_batches,
    list_refunds,
    retry_refund,
    run_weekly_payouts,
    serialize_batch,
    serialize_refund,
    sweep_expired_requests,
)
from app.services.settings import (
    SETTING_META,
    WEEKDAY_LABELS,
    get_settings_map,
    serialize_setting,
    update_settings,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class SettingsPatchBody(BaseModel):
    settings: dict[str, object] = Field(default_factory=dict)


class ContactStatusBody(BaseModel):
    status: str = Field(pattern="^(new|read)$")


class RejectBody(BaseModel):
    reason: str | None = None


def _serialize_user(row: User, *, request_count: int = 0, donation_count: int = 0) -> dict:
    return {
        "id": str(row.id),
        "phone": row.phone,
        "email": row.email,
        "role": row.role,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "request_count": request_count,
        "donation_count": donation_count,
    }


def _serialize_donation(row: Donation) -> dict:
    return {
        "id": str(row.id),
        "status": row.status,
        "gross_amount": float(row.gross_amount),
        "net_to_request": float(row.net_to_request),
        "platform_fee_amount": float(row.platform_fee_amount),
        "fee_percent_snapshot": float(row.fee_percent_snapshot),
        "paystack_reference": row.paystack_reference,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "help_request": {
            "id": str(row.help_request.id),
            "full_name": row.help_request.full_name,
            "status": row.help_request.status,
        }
        if row.help_request
        else None,
        "donor": {
            "id": str(row.donor.id),
            "phone": row.donor.phone,
            "email": row.donor.email,
        }
        if row.donor
        else None,
    }


@router.get("/ping")
def admin_ping(admin: User = Depends(get_current_admin)) -> dict:
    return {"ok": True, "role": admin.role, "phone": admin.phone}


@router.get("/overview")
def admin_overview(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    def count_requests(*statuses: str) -> int:
        return int(
            db.scalar(
                select(func.count()).select_from(HelpRequest).where(HelpRequest.status.in_(statuses))
            )
            or 0
        )

    pending = count_requests(HelpRequestStatus.PENDING_REVIEW.value)
    live = count_requests(HelpRequestStatus.LIVE.value)
    funded = count_requests(HelpRequestStatus.FUNDED.value)
    users = int(db.scalar(select(func.count()).select_from(User)) or 0)
    donations_held = int(
        db.scalar(
            select(func.count())
            .select_from(Donation)
            .where(Donation.status == DonationStatus.HELD.value)
        )
        or 0
    )
    held_total = float(
        db.scalar(
            select(func.coalesce(func.sum(Donation.net_to_request), 0)).where(
                Donation.status == DonationStatus.HELD.value
            )
        )
        or 0
    )
    gifted_week = float(
        db.scalar(
            select(func.coalesce(func.sum(Donation.net_to_request), 0)).where(
                Donation.status.in_(
                    [DonationStatus.HELD.value, DonationStatus.PAID_OUT.value]
                ),
                Donation.created_at >= week_ago,
            )
        )
        or 0
    )
    open_refunds = int(
        db.scalar(
            select(func.count()).select_from(Refund).where(Refund.status.in_(["pending", "failed"]))
        )
        or 0
    )

    recent_requests = list(
        db.scalars(
            select(HelpRequest)
            .options(selectinload(HelpRequest.photo))
            .order_by(HelpRequest.created_at.desc())
            .limit(6)
        ).all()
    )
    recent_audit = list(
        db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)).all()
    )

    return {
        "stats": {
            "users": users,
            "pending_requests": pending,
            "live_requests": live,
            "funded_requests": funded,
            "held_donations": donations_held,
            "held_total_ngn": held_total,
            "gifted_last_7_days_ngn": gifted_week,
            "open_refunds": open_refunds,
            "new_messages": count_new_contact_messages(db),
        },
        "recent_requests": [
            serialize_help_request(row, include_private=True) for row in recent_requests
        ],
        "recent_audit": [
            {
                "id": str(row.id),
                "action": row.action,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in recent_audit
        ],
    }


@router.get("/users")
def admin_list_users(
    q: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where((User.phone.ilike(like)) | (User.email.ilike(like)))
    users = list(db.scalars(stmt.limit(200)).all())

    request_counts = dict(
        db.execute(select(HelpRequest.user_id, func.count()).group_by(HelpRequest.user_id)).all()
    )
    donation_counts = dict(
        db.execute(
            select(Donation.donor_user_id, func.count())
            .where(Donation.donor_user_id.is_not(None))
            .group_by(Donation.donor_user_id)
        ).all()
    )

    return {
        "items": [
            _serialize_user(
                user,
                request_count=int(request_counts.get(user.id, 0)),
                donation_count=int(donation_counts.get(user.id, 0)),
            )
            for user in users
        ]
    }


@router.get("/donations")
def admin_list_donations(
    status: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    if status and status not in {item.value for item in DonationStatus}:
        raise HTTPException(status_code=400, detail="Invalid donation status")
    stmt = (
        select(Donation)
        .options(selectinload(Donation.help_request), selectinload(Donation.donor))
        .order_by(Donation.created_at.desc())
        .limit(200)
    )
    if status:
        stmt = stmt.where(Donation.status == status)
    rows = list(db.scalars(stmt).all())
    return {"items": [_serialize_donation(row) for row in rows]}


@router.get("/help-requests")
def admin_list_help_requests(
    status: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    if status and status not in {item.value for item in HelpRequestStatus}:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    rows = list_admin_requests(db, status=status)
    return {"items": [serialize_help_request(row, include_private=True) for row in rows]}


@router.post("/help-requests/{request_id}/approve")
def admin_approve_help_request(
    request_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    row = get_help_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Help request not found")
    try:
        updated = approve_request(db, row=row, admin=admin)
    except HelpRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_help_request(updated, include_private=True)


@router.post("/help-requests/{request_id}/reject")
def admin_reject_help_request(
    request_id: uuid.UUID,
    body: RejectBody,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    row = get_help_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Help request not found")
    try:
        updated = reject_request(db, row=row, admin=admin, reason=body.reason)
    except HelpRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_help_request(updated, include_private=True)


@router.get("/money-operations")
def admin_money_operations(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    return {
        "payout_batches": [serialize_batch(row) for row in list_payout_batches(db)],
        "refunds": [serialize_refund(row) for row in list_refunds(db)],
    }


@router.post("/payouts/run")
def admin_run_payouts(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    batch = run_weekly_payouts(db, admin=admin)
    return {"batch": serialize_batch(batch)}


@router.post("/refunds/sweep-deadlines")
def admin_sweep_deadlines(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    return sweep_expired_requests(db, actor=admin)


@router.post("/refunds/{refund_id}/retry")
def admin_retry_refund(
    refund_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    try:
        refund = retry_refund(db, refund_id)
    except MoneyOperationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"refund": serialize_refund(refund)}


@router.get("/settings")
def admin_get_settings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    settings_map = get_settings_map(db)
    items = []
    for key in SETTING_META:
        row = settings_map.get(key)
        if row is None:
            meta = SETTING_META[key]
            items.append(
                {
                    "key": key,
                    "value": None,
                    "raw_value": "",
                    "value_type": meta.value_type,
                    "label": meta.label,
                    "description": meta.description,
                    "updated_at": None,
                }
            )
        else:
            items.append(serialize_setting(row))
    return {
        "settings": items,
        "meta": {"payout_weekday_labels": list(WEEKDAY_LABELS)},
        "admin": {"phone": admin.phone},
    }


@router.patch("/settings")
def admin_patch_settings(
    body: SettingsPatchBody,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    rows = update_settings(db, updates=body.settings, admin=admin)
    return {"ok": True, "settings": [serialize_setting(row) for row in rows]}


@router.get("/contact-messages")
def admin_list_contact_messages(
    status: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    _ = admin
    if status and status not in {"new", "read"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    rows = list_contact_messages(db, status=status)
    return {
        "items": [serialize_contact_message(row) for row in rows],
        "new_count": count_new_contact_messages(db),
    }


@router.patch("/contact-messages/{message_id}")
def admin_update_contact_message(
    message_id: uuid.UUID,
    body: ContactStatusBody,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    row = get_contact_message(db, message_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Message not found")
    try:
        updated = mark_contact_message(db, row=row, status=body.status, admin=admin)
    except ContactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_contact_message(updated)
