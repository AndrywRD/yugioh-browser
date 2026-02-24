from dataclasses import dataclass

from src.domain.enums import WidgetType
from src.domain.exceptions import ValidationError


@dataclass(slots=True)
class Widget:
    id: str
    dashboard_id: str
    name: str
    type: WidgetType
    position: dict
    config: dict
    data_source_id: str | None = None
    query: str | None = None
    refresh_interval: int | None = None

    def __post_init__(self) -> None:
        required_position_keys = {"x", "y", "width", "height"}
        if not required_position_keys.issubset(self.position.keys()):
            raise ValidationError("Widget position must contain x, y, width, height")
