from dataclasses import dataclass, field

from src.domain.entities.widget import Widget
from src.domain.exceptions import ValidationError


@dataclass(slots=True)
class Dashboard:
    id: str
    user_id: str
    name: str
    description: str | None = None
    layout: dict = field(default_factory=lambda: {"widgets": []})
    refresh_interval: int = 300
    is_public: bool = False
    is_favorite: bool = False
    widgets: list[Widget] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.name or len(self.name.strip()) == 0:
            raise ValidationError("Dashboard name is required")

    def add_widget(self, widget: Widget) -> None:
        self.widgets.append(widget)
        self.layout.setdefault("widgets", [])
        self.layout["widgets"].append(widget.position)

    def remove_widget(self, widget_id: str) -> None:
        self.widgets = [item for item in self.widgets if item.id != widget_id]
