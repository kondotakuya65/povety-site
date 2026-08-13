from fastapi import APIRouter, Depends

from app.api.deps import get_current_admin
from app.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
def admin_ping(admin: User = Depends(get_current_admin)) -> dict:
    return {"ok": True, "role": admin.role, "phone": admin.phone}
