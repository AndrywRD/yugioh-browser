from dataclasses import dataclass, field
from datetime import datetime

from src.domain.enums import UserRole


@dataclass(slots=True)
class User:
    id: str
    email: str
    password_hash: str
    full_name: str | None = None
    role: UserRole = UserRole.VIEWER
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def can_edit(self) -> bool:
        return self.role in {UserRole.ADMIN, UserRole.EDITOR}

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN
