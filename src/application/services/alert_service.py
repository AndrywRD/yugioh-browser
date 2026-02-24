from __future__ import annotations

from datetime import UTC, datetime

from src.domain.entities import Alert
from src.domain.repositories import AlertRepository


class AlertService:
    def __init__(self, alert_repo: AlertRepository) -> None:
        self.alert_repo = alert_repo

    def evaluate(self, alert: Alert, metric_value: float) -> bool:
        if alert.should_trigger(metric_value):
            alert.last_triggered_at = datetime.now(UTC)
            self.alert_repo.update(alert)
            return True
        return False

    def evaluate_all(self, metric_values: dict[str, float]) -> list[dict]:
        results: list[dict] = []
        for alert in self.alert_repo.list_active():
            if not alert.widget_id:
                continue
            value = metric_values.get(alert.widget_id)
            if value is None:
                continue
            triggered = self.evaluate(alert, value)
            results.append(
                {
                    "alert_id": alert.id,
                    "widget_id": alert.widget_id,
                    "triggered": triggered,
                    "value": value,
                }
            )
        return results
