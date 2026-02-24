from __future__ import annotations

from src.domain.entities import User
from src.domain.enums import UserRole
from src.infrastructure.persistence.database import db_session_scope
from src.infrastructure.persistence.repositories import PostgresUserRepository
from src.infrastructure.security import get_password_hash
from src.shared.config import get_settings
from src.shared.utils import generate_uuid


def ensure_default_admin() -> None:
    settings = get_settings()
    with db_session_scope() as session:
        repo = PostgresUserRepository(session)
        existing = repo.get_by_email(settings.admin_email)
        if existing is not None:
            return

        repo.create(
            User(
                id=generate_uuid(),
                email=settings.admin_email,
                password_hash=get_password_hash(settings.admin_password),
                full_name=settings.admin_full_name,
                role=UserRole.ADMIN,
            )
        )
