from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class MetricDTO:
    id: str
    metric_name: str
    metric_value: float
    metric_type: str
    timestamp: datetime
    dimensions: dict | None = None
