import re
from dataclasses import dataclass
from datetime import datetime

from src.domain.enums import MetricType
from src.domain.exceptions import InvalidMetricError
from src.domain.value_objects import MetricValue

METRIC_NAME_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


@dataclass(slots=True)
class Metric:
    id: str
    widget_id: str | None
    metric_name: str
    metric_value: MetricValue
    metric_type: MetricType = MetricType.RAW
    timestamp: datetime | None = None
    dimensions: dict | None = None

    def __post_init__(self) -> None:
        if not METRIC_NAME_PATTERN.match(self.metric_name):
            raise InvalidMetricError("Invalid metric name")

    @property
    def value_as_float(self) -> float:
        return self.metric_value.to_float()
