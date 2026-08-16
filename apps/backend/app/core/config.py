from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Prosperax API"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/prosperax"
    upload_dir: str = str(BACKEND_ROOT / "uploads")
    admin_phone: str = "+2348000000000"
    admin_phones: str = ""
    admin_email: str = "admin@prosperax.org"
    jwt_secret: str = "change-me-in-production-prosperax"
    jwt_expire_minutes: int = 60 * 24 * 7
    otp_ttl_seconds: int = 600
    otp_resend_seconds: int = 60
    otp_max_attempts: int = 5
    sms_provider: str = "console"
    termii_api_key: str = ""
    termii_sender_id: str = "Prosperax"
    mail_provider: str = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    mail_from: str = "Prosperax <noreply@prosperax.org>"
    mail_reply_to: str = ""
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_mock: bool = True
    frontend_url: str = "http://localhost:3000"

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local"}

    @property
    def mail_is_console(self) -> bool:
        provider = self.mail_provider.strip().lower()
        if provider == "console":
            return True
        if provider == "smtp":
            return not bool(self.smtp_host.strip())
        # Default: console unless SMTP host is configured
        return not bool(self.smtp_host.strip())

    @property
    def paystack_is_mock(self) -> bool:
        if self.paystack_mock:
            return True
        return not bool(self.paystack_secret_key.strip())

    def admin_phone_list(self) -> list[str]:
        from app.core.phone import InvalidPhoneError, normalize_ng_phone

        raw = [self.admin_phone, *self.admin_phones.split(",")]
        phones: list[str] = []
        for item in raw:
            item = item.strip()
            if not item:
                continue
            try:
                phones.append(normalize_ng_phone(item))
            except InvalidPhoneError:
                phones.append(item)
        return list(dict.fromkeys(phones))


settings = Settings()
