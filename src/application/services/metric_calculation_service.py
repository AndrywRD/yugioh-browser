from __future__ import annotations

from statistics import mean
from typing import Iterable

import numpy as np

from src.domain.enums import MetricType


class MetricCalculationService:
    def calculate_basic(self, values: Iterable[float], metric_type: MetricType) -> float:
        numbers = list(values)
        if not numbers:
            return 0.0

        if metric_type == MetricType.SUM:
            return float(sum(numbers))
        if metric_type == MetricType.AVG:
            return float(mean(numbers))
        if metric_type == MetricType.COUNT:
            return float(len(numbers))
        if metric_type == MetricType.MIN:
            return float(min(numbers))
        if metric_type == MetricType.MAX:
            return float(max(numbers))
        if metric_type == MetricType.PERCENTILE:
            return float(np.percentile(numbers, 95))

        return float(numbers[-1])

    def growth_rate(self, current: float, previous: float) -> float:
        if previous == 0:
            return 0.0
        return ((current - previous) / abs(previous)) * 100

    def moving_average(self, values: Iterable[float], window: int = 3) -> list[float]:
        numbers = list(values)
        if window <= 0:
            return numbers
        result: list[float] = []
        for index in range(len(numbers)):
            start = max(index - window + 1, 0)
            chunk = numbers[start : index + 1]
            result.append(float(mean(chunk)))
        return result

    def exponential_moving_average(self, values: Iterable[float], alpha: float = 0.3) -> list[float]:
        numbers = list(values)
        if not numbers:
            return []
        ema = [float(numbers[0])]
        for value in numbers[1:]:
            ema.append(alpha * value + (1 - alpha) * ema[-1])
        return ema

    def compare(self, left: float, right: float) -> dict:
        delta = left - right
        pct = 0.0 if right == 0 else (delta / abs(right)) * 100
        return {"left": left, "right": right, "delta": delta, "delta_percent": pct}
