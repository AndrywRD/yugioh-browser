from __future__ import annotations

import base64
import hashlib
import json

from cryptography.fernet import Fernet

from src.shared.config import get_settings


def _build_fernet_key(seed: str) -> bytes:
    try:
        raw = seed.encode("utf-8")
        return base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise ValueError("Invalid ENCRYPTION_KEY") from exc


class CredentialEncryptionService:
    def __init__(self) -> None:
        settings = get_settings()
        key = _build_fernet_key(settings.encryption_key)
        self.fernet = Fernet(key)

    def encrypt_credentials(self, credentials: dict) -> str:
        payload = json.dumps(credentials).encode("utf-8")
        encrypted = self.fernet.encrypt(payload)
        return base64.urlsafe_b64encode(encrypted).decode("utf-8")

    def decrypt_credentials(self, encrypted_credentials: str) -> dict:
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_credentials.encode("utf-8"))
        decrypted = self.fernet.decrypt(encrypted_bytes)
        return json.loads(decrypted.decode("utf-8"))
