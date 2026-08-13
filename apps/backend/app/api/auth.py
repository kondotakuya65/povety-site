import hmac
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.phone import InvalidPhoneError, normalize_ng_phone
from app.core.security import create_access_token, generate_otp_code, hash_otp
from app.api.deps import get_current_user
from app.models import AuditLog, OtpCode, User, UserRole
from app.services.sms import SmsError, send_otp_sms

router = APIRouter(prefix="/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PhoneBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class VerifyBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    code: str = Field(min_length=4, max_length=8)


class EmailBody(BaseModel):
    email: str = Field(min_length=5, max_length=255)


class UserOut(BaseModel):
    id: str
    phone: str
    email: str | None
    role: str

    model_config = {"from_attributes": True}


def _user_out(user: User) -> UserOut:
    return UserOut(id=str(user.id), phone=user.phone, email=user.email, role=user.role)


def _parse_phone(raw: str) -> str:
    try:
        return normalize_ng_phone(raw)
    except InvalidPhoneError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/otp/request")
def request_otp(body: PhoneBody, db: Session = Depends(get_db)) -> dict:
    phone = _parse_phone(body.phone)
    now = datetime.now(timezone.utc)

    latest = db.scalar(
        select(OtpCode)
        .where(OtpCode.phone == phone)
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    if latest and latest.consumed_at is None:
        wait_until = latest.created_at + timedelta(seconds=settings.otp_resend_seconds)
        if now < wait_until:
            wait = int((wait_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Wait {wait}s before requesting another code",
            )

    code = generate_otp_code()
    otp = OtpCode(
        phone=phone,
        code_hash=hash_otp(phone, code),
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(otp)
    try:
        send_otp_sms(phone, code)
    except SmsError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    db.commit()
    payload: dict = {"ok": True, "phone": phone, "expires_in": settings.otp_ttl_seconds}
    if settings.is_dev:
        payload["dev_otp"] = code
    return payload


@router.post("/otp/verify")
def verify_otp(body: VerifyBody, db: Session = Depends(get_db)) -> dict:
    phone = _parse_phone(body.phone)
    code = body.code.strip()
    now = datetime.now(timezone.utc)

    otp = db.scalar(
        select(OtpCode)
        .where(
            OtpCode.phone == phone,
            OtpCode.consumed_at.is_(None),
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    if otp is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    if otp.attempt_count >= settings.otp_max_attempts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many attempts. Request a new code")

    if not hmac.compare_digest(otp.code_hash, hash_otp(phone, code)):
        otp.attempt_count += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    otp.consumed_at = now
    user = db.scalar(select(User).where(User.phone == phone))
    created = False
    if user is None:
        role = UserRole.ADMIN.value if phone in settings.admin_phone_list() else UserRole.USER.value
        user = User(phone=phone, role=role)
        db.add(user)
        db.flush()
        created = True
    elif phone in settings.admin_phone_list() and user.role != UserRole.ADMIN.value:
        user.role = UserRole.ADMIN.value

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="auth_login",
            entity_type="user",
            entity_id=str(user.id),
            payload={"created": created},
        )
    )
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id, phone=user.phone, role=user.role)
    return {"token": token, "user": _user_out(user).model_dump()}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(user)


@router.patch("/me")
def update_me(body: EmailBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email")

    taken = db.scalar(select(User).where(User.email == email, User.id != user.id))
    if taken:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email is already in use")

    user.email = email
    db.commit()
    db.refresh(user)
    return _user_out(user)
