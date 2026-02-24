from dataclasses import dataclass
from datetime import datetime

from src.domain.exceptions import ValidationError


@dataclass(frozen=True, slots=True)
class TimeRange:
    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        if self.start >= self.end:
            raise ValidationError("TimeRange start must be before end")

    def duration_seconds(self) -> int:
        return int((self.end - self.start).total_seconds())
