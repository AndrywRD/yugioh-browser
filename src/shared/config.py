from functools import lru_cache
from typing import List
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="KPI Dashboard API", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")

    secret_key: str = Field(default="change-this-secret-in-production", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    encryption_key: str = Field(default="local-encryption-key", alias="ENCRYPTION_KEY")

    database_url: str = Field(default="sqlite:///./kpi_dashboard.db", alias="DATABASE_URL")
    test_database_url: str = Field(default="sqlite:///./kpi_dashboard_test.db", alias="TEST_DATABASE_URL")

    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    cache_enabled: bool = Field(default=True, alias="CACHE_ENABLED")

    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="reports", alias="MINIO_BUCKET")
    minio_secure: bool = Field(default=False, alias="MINIO_SECURE")

    celery_broker_url: str = Field(default="redis://localhost:6379/1", alias="CELERY_BROKER_URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/2", alias="CELERY_RESULT_BACKEND")

    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")

    admin_email: str = Field(default="admin@example.com", alias="ADMIN_EMAIL")
    admin_password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    admin_full_name: str = Field(default="Admin User", alias="ADMIN_FULL_NAME")

    def cors_origins_list(self) -> List[str]:
        origins = {origin.strip() for origin in self.cors_origins.split(",") if origin.strip()}

        # In local development, accept both localhost and 127.0.0.1 for each configured origin.
        for origin in list(origins):
            parsed = urlsplit(origin)
            hostname = parsed.hostname
            if not hostname:
                continue
            if hostname not in {"localhost", "127.0.0.1"}:
                continue

            peer_host = "127.0.0.1" if hostname == "localhost" else "localhost"
            peer_netloc = peer_host if parsed.port is None else f"{peer_host}:{parsed.port}"
            peer_origin = urlunsplit((parsed.scheme, peer_netloc, "", "", ""))
            origins.add(peer_origin)

        return sorted(origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
