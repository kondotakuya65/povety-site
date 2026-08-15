import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.services.donations import (
    DonationError,
    confirm_donation,
    get_donation_by_reference,
    initialize_donation,
    list_my_donations,
    list_supporters,
    mark_donation_held,
    serialize_donation,
    serialize_supporter,
)
from app.services.paystack import verify_webhook_signature
from app.services.money_operations import (
    MoneyOperationError,
    request_donor_refund,
    serialize_refund,
    update_refund_from_webhook,
    update_transfer_from_webhook,
)

router = APIRouter(tags=["donations"])


class InitializeBody(BaseModel):
    help_request_id: uuid.UUID
    amount: float = Field(gt=0)
    email: str | None = None


class ConfirmBody(BaseModel):
    reference: str = Field(min_length=6, max_length=128)


@router.post("/donations/initialize")
def donations_initialize(
    body: InitializeBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return initialize_donation(
            db,
            user=user,
            help_request_id=body.help_request_id,
            amount=body.amount,
            email=body.email,
        )
    except DonationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/donations/confirm")
def donations_confirm(
    body: ConfirmBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    donation = get_donation_by_reference(db, body.reference)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.donor_user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    try:
        held = confirm_donation(db, reference=body.reference)
    except DonationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"donation": serialize_donation(held, include_private=True)}


@router.get("/donations/mine")
def donations_mine(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    rows = list_my_donations(db, user)
    items = []
    for row in rows:
        item = serialize_donation(row, include_private=True)
        if row.help_request is not None:
            item["help_request"] = {
                "id": str(row.help_request.id),
                "full_name": row.help_request.full_name,
                "status": row.help_request.status,
            }
        items.append(item)
    return {"items": items}


@router.post("/donations/{donation_id}/refund")
def donor_refund(
    donation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        refund = request_donor_refund(db, donation_id=donation_id, user=user)
    except MoneyOperationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"refund": serialize_refund(refund)}


@router.get("/help-requests/{request_id}/supporters")
def request_supporters(request_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    rows = list_supporters(db, request_id)
    return {"items": [serialize_supporter(row) for row in rows]}


@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    raw = await request.body()
    signature = request.headers.get("x-paystack-signature")
    if not verify_webhook_signature(raw, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json

    payload = json.loads(raw.decode() or "{}")
    event = payload.get("event")
    data = payload.get("data") or {}
    reference = data.get("reference")
    if event in {"transfer.success", "transfer.failed", "transfer.reversed"} and reference:
        update_transfer_from_webhook(
            db,
            reference=reference,
            successful=event == "transfer.success",
            transfer_code=data.get("transfer_code"),
            failure_reason=data.get("reason") or data.get("gateway_response"),
        )
        return {"ok": True}

    if event in {"refund.processed", "refund.failed"}:
        transaction = data.get("transaction") or {}
        transaction_reference = (
            transaction.get("reference")
            if isinstance(transaction, dict)
            else data.get("transaction_reference")
        )
        transaction_reference = transaction_reference or data.get(
            "transaction_reference"
        )
        if transaction_reference:
            update_refund_from_webhook(
                db,
                transaction_reference=str(transaction_reference),
                successful=event == "refund.processed",
                refund_reference=str(data.get("id") or data.get("reference") or ""),
                failure_reason=data.get("message") or data.get("reason"),
            )
        return {"ok": True}

    if event != "charge.success" or not reference:
        return {"ok": True, "ignored": True}

    donation = get_donation_by_reference(db, reference)
    if donation is None:
        return {"ok": True, "ignored": True}

    if donation.status == "held":
        return {"ok": True, "already_held": True}

    try:
        mark_donation_held(db, donation)
    except DonationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}
