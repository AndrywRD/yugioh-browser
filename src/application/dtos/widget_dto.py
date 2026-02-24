from dataclasses import dataclass


@dataclass(slots=True)
class WidgetDTO:
    id: str
    dashboard_id: str
    name: str
    type: str
    position: dict
    config: dict
    data_source_id: str | None = None
    query: str | None = None
