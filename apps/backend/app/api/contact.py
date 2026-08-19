from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.contact import ContactError, create_contact_message, serialize_contact_message

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    topic: str = "general"
    message: str = Field(min_length=10, max_length=2000)


@router.post("")
def submit_contact(body: ContactBody, db: Session = Depends(get_db)) -> dict:
    try:
        row = create_contact_message(
            db,
            name=body.name,
            email=body.email,
            phone=body.phone,
            topic=body.topic,
            body=body.message,
        )
    except ContactError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "id": str(row.id), "message": serialize_contact_message(row)}
