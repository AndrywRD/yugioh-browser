from dataclasses import dataclass
from operator import eq, ge, gt, le, lt
from typing import Callable

from src.domain.exceptions import InvalidThresholdError


OPERATORS: dict[str, Callable[[float, float], bool]] = {
    "gt": gt,
    "gte": ge,
    "lt": lt,
    "lte": le,
    "eq": eq,
}


@dataclass(frozen=True, slots=True)
class Threshold:
    operator: str
    value: float

    def __post_init__(self) -> None:
        if self.operator not in OPERATORS:
            raise InvalidThresholdError(f"Unsupported operator: {self.operator}")

    def is_triggered(self, metric_value: float) -> bool:
        return OPERATORS[self.operator](metric_value, self.value)
