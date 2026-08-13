"""Seed default app settings and the bootstrap admin user."""

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.phone import InvalidPhoneError, normalize_ng_phone
from app.core.settings_defaults import DEFAULT_APP_SETTINGS
from app.models import AppSetting, AuditLog, User, UserRole


def _admin_phone() -> str:
    try:
        return normalize_ng_phone(settings.admin_phone)
    except InvalidPhoneError:
        return settings.admin_phone


def seed() -> None:
    db = SessionLocal()
    try:
        phone = _admin_phone()
        admin = db.scalar(select(User).where(User.phone == phone))
        if admin is None:
            admin = User(
                phone=phone,
                email=settings.admin_email,
                role=UserRole.ADMIN.value,
            )
            db.add(admin)
            db.flush()
            print(f"Created admin user {admin.phone}")
        elif admin.role != UserRole.ADMIN.value:
            admin.role = UserRole.ADMIN.value
            print(f"Promoted {admin.phone} to admin")
        else:
            print(f"Admin user already exists: {admin.phone}")

        created_keys: list[str] = []
        for key, value, value_type in DEFAULT_APP_SETTINGS:
            existing = db.get(AppSetting, key)
            if existing is None:
                db.add(
                    AppSetting(
                        key=key,
                        value=value,
                        value_type=value_type,
                        updated_by_id=admin.id,
                    )
                )
                created_keys.append(key)

        if created_keys:
            db.add(
                AuditLog(
                    actor_user_id=admin.id,
                    action="seed_settings",
                    entity_type="app_settings",
                    entity_id=None,
                    payload={"created_keys": created_keys},
                )
            )
            print(f"Seeded settings: {', '.join(created_keys)}")
        else:
            print("App settings already present")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
