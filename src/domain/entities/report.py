from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class Report:
    id: str
    user_id: str
    dashboard_id: str | None
    name: str
    format: str
    schedule: dict | None = None
    recipients: list[str] | None = None
    file_path: str | None = None
    is_active: bool = True
    last_generated_at: datetime | None = None
