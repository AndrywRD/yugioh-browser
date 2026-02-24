from dataclasses import dataclass
from datetime import datetime

from src.domain.enums import DataSourceType


@dataclass(slots=True)
class DataSource:
    id: str
    user_id: str
    name: str
    type: DataSourceType
    config: dict
    credentials: dict | None = None
    description: str | None = None
    is_active: bool = True
    last_sync_at: datetime | None = None
    last_sync_status: str | None = None
