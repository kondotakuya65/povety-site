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
    admin_email: str = "admin@prosperax.org"


settings = Settings()
