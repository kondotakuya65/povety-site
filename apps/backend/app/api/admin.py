import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models import HelpRequestStatus, User
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


class RejectBody(BaseModel):
    reason: str | None = None


@router.get("/ping")
def admin_ping(admin: User = Depends(get_current_admin)) -> dict:
    return {"ok": True, "role": admin.role, "phone": admin.phone}


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
