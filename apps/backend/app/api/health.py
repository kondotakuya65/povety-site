from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    database = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database = "error"

    upload_dir = Path(settings.upload_dir)
    return {
        "status": "ok" if database == "ok" else "degraded",
        "service": settings.app_name,
        "environment": settings.environment,
        "database": database,
        "upload_dir": str(upload_dir),
        "upload_dir_exists": upload_dir.exists(),
        "time": datetime.now(timezone.utc).isoformat(),
    }
