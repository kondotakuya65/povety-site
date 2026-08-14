from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.models import HelpRequestStatus, User, UserRole, Visibility
from app.services.help_requests import (
    HelpRequestError,
    create_help_request,
    get_help_request,
    list_live_requests,
    list_mine,
    save_photo,
    serialize_help_request,
)

router = APIRouter(prefix="/help-requests", tags=["help-requests"])


@router.get("")
def public_list(db: Session = Depends(get_db)) -> dict:
    rows = list_live_requests(db)
    return {"items": [serialize_help_request(row) for row in rows]}


@router.get("/mine")
def my_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    rows = list_mine(db, user)
    return {"items": [serialize_help_request(row, include_private=True) for row in rows]}


@router.get("/{request_id}")
def get_one(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> dict:
    row = get_help_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Help request not found")

    is_owner = user is not None and row.user_id == user.id
    is_admin = user is not None and user.role == UserRole.ADMIN.value
    is_public_live = (
        row.status == HelpRequestStatus.LIVE.value and row.visibility == Visibility.PUBLIC.value
    )
    if not (is_public_live or is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Help request not found")

    return serialize_help_request(row, include_private=is_owner or is_admin)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(
    full_name: str = Form(...),
    story: str = Form(...),
    goal_ngn: str = Form(...),
    verification_type: str = Form(...),
    deadline_days: int | None = Form(None),
    verification_nin: str | None = Form(None),
    verification_phone: str | None = Form(None),
    bank_code: str | None = Form(None),
    account_number: str | None = Form(None),
    account_name: str | None = Form(None),
    photo: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        asset = await save_photo(db, user=user, photo=photo)
        row = create_help_request(
            db,
            user=user,
            full_name=full_name,
            story=story,
            goal_ngn=goal_ngn,
            deadline_days=deadline_days,
            verification_type=verification_type,
            verification_nin=verification_nin,
            verification_phone=verification_phone,
            bank_code=bank_code,
            account_number=account_number,
            account_name=account_name,
            photo=asset,
        )
    except HelpRequestError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_help_request(row, include_private=True)
