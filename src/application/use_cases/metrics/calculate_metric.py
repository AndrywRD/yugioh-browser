from datetime import UTC, datetime

from src.application.services import MetricCalculationService
from src.domain.entities import Metric
from src.domain.enums import MetricType
from src.domain.repositories import MetricRepository
from src.domain.value_objects import MetricValue
from src.shared.utils import generate_uuid


class CalculateMetricUseCase:
    def __init__(self, repository: MetricRepository, service: MetricCalculationService) -> None:
        self.repository = repository
        self.service = service

    def execute(self, widget_id: str | None, metric_name: str, values: list[float], metric_type: MetricType) -> Metric:
        calculated = self.service.calculate_basic(values, metric_type)
        metric = Metric(
            id=generate_uuid(),
            widget_id=widget_id,
            metric_name=metric_name,
            metric_value=MetricValue(calculated),
            metric_type=metric_type,
            timestamp=datetime.now(UTC),
        )
        return self.repository.create(metric)
