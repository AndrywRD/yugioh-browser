from abc import ABC, abstractmethod
from datetime import datetime

from src.domain.entities import Metric


class MetricRepository(ABC):
    @abstractmethod
    def create(self, metric: Metric) -> Metric:
        raise NotImplementedError

    @abstractmethod
    def create_many(self, metrics: list[Metric]) -> int:
        raise NotImplementedError

    @abstractmethod
    def get_history(
        self,
        metric_name: str,
        start_date: datetime,
        end_date: datetime,
        widget_id: str | None = None,
    ) -> list[Metric]:
        raise NotImplementedError

    @abstractmethod
    def get_latest_by_widget(self, widget_id: str) -> Metric | None:
        raise NotImplementedError
