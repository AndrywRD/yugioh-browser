from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import MetricRepository, WidgetRepository


class GetWidgetDataUseCase:
    def __init__(self, widget_repo: WidgetRepository, metric_repo: MetricRepository) -> None:
        self.widget_repo = widget_repo
        self.metric_repo = metric_repo

    def execute(self, widget_id: str) -> dict:
        widget = self.widget_repo.get_by_id(widget_id)
        if widget is None:
            raise EntityNotFoundError("Widget not found")

        metric = self.metric_repo.get_latest_by_widget(widget_id)
        return {
            "id": widget.id,
            "name": widget.name,
            "type": widget.type.value,
            "config": widget.config,
            "position": widget.position,
            "data": {
                "metric_name": metric.metric_name if metric else None,
                "metric_value": metric.value_as_float if metric else None,
                "timestamp": metric.timestamp.isoformat() if metric and metric.timestamp else None,
            },
        }
