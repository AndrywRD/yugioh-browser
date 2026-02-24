from __future__ import annotations

from typing import Any

from sqlalchemy import String, TypeDecorator

from src.infrastructure.security import CredentialEncryptionService


class EncryptedCredentialsType(TypeDecorator):
    impl = String
    cache_ok = True

    def __init__(self, length: int = 4000, *args: Any, **kwargs: Any) -> None:
        super().__init__(length=length, *args, **kwargs)
        self.service = CredentialEncryptionService()

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, dict):
            return self.service.encrypt_credentials(value)
        return value

    def process_result_value(self, value: Any, dialect: Any) -> dict | None:
        if value is None:
            return None
        if isinstance(value, dict):
            return value
        return self.service.decrypt_credentials(value)
