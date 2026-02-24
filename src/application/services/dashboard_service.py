from __future__ import annotations

from src.domain.entities import Dashboard
from src.domain.repositories import MetricRepository, WidgetRepository


class DashboardService:
    def __init__(self, widget_repo: WidgetRepository, metric_repo: MetricRepository) -> None:
        self.widget_repo = widget_repo
        self.metric_repo = metric_repo

    def build_dashboard_data(self, dashboard: Dashboard) -> dict:
        widgets = self.widget_repo.list_by_dashboard(dashboard.id)
        payload_widgets: list[dict] = []

        for widget in widgets:
            latest_metric = self.metric_repo.get_latest_by_widget(widget.id)
            payload_widgets.append(
                {
                    "id": widget.id,
                    "name": widget.name,
                    "type": widget.type.value,
                    "position": widget.position,
                    "config": widget.config,
                    "data": {
                        "metric_name": latest_metric.metric_name if latest_metric else None,
                        "metric_value": latest_metric.value_as_float if latest_metric else None,
                        "timestamp": latest_metric.timestamp.isoformat() if latest_metric and latest_metric.timestamp else None,
                    },
                }
            )

        return {
            "id": dashboard.id,
            "name": dashboard.name,
            "description": dashboard.description,
            "refresh_interval": dashboard.refresh_interval,
            "widgets": payload_widgets,
        }
