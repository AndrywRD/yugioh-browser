from dataclasses import dataclass
from datetime import datetime

from src.domain.enums import AlertSeverity
from src.domain.value_objects import Threshold


@dataclass(slots=True)
class Alert:
    id: str
    user_id: str
    widget_id: str | None
    name: str
    threshold: Threshold
    severity: AlertSeverity
    notification_channels: list[str]
    is_active: bool = True
    last_triggered_at: datetime | None = None

    def should_trigger(self, metric_value: float) -> bool:
        if not self.is_active:
            return False
        return self.threshold.is_triggered(metric_value)
