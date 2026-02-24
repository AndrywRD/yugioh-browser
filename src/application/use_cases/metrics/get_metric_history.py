from datetime import datetime

from src.domain.repositories import MetricRepository


class GetMetricHistoryUseCase:
    def __init__(self, repository: MetricRepository) -> None:
        self.repository = repository

    def execute(
        self,
        metric_name: str,
        start_date: datetime,
        end_date: datetime,
        widget_id: str | None = None,
    ):
        return self.repository.get_history(metric_name, start_date, end_date, widget_id)
