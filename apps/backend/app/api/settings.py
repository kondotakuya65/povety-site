from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.settings import get_public_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/public")
def public_settings(db: Session = Depends(get_db)) -> dict:
    return get_public_settings(db)
