from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models import User
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


@router.get("/ping")
def admin_ping(admin: User = Depends(get_current_admin)) -> dict:
    return {"ok": True, "role": admin.role, "phone": admin.phone}


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
