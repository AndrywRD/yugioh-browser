from dataclasses import dataclass
from decimal import Decimal
from math import isinf, isnan

from src.domain.exceptions import InvalidMetricError


@dataclass(frozen=True, slots=True)
class MetricValue:
    value: Decimal

    def __init__(self, value: float | int | str | Decimal) -> None:
        decimal_value = Decimal(str(value))

        if decimal_value.is_nan():
            raise InvalidMetricError("Metric value cannot be NaN")

        if decimal_value in {Decimal("Infinity"), Decimal("-Infinity")}:
            raise InvalidMetricError("Metric value cannot be infinity")

        object.__setattr__(self, "value", decimal_value)

    def to_float(self) -> float:
        return float(self.value)
