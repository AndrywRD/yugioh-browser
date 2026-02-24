from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class ETLJob:
    id: str
    data_source_id: str
    job_type: str
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    rows_processed: int = 0
    rows_failed: int = 0
    error_message: str | None = None
    metadata: dict | None = None
