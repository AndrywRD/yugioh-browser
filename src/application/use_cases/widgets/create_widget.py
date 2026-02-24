from src.domain.entities import Widget
from src.domain.enums import WidgetType
from src.domain.repositories import WidgetRepository
from src.shared.utils import generate_uuid


class CreateWidgetUseCase:
    def __init__(self, repository: WidgetRepository) -> None:
        self.repository = repository

    def execute(
        self,
        dashboard_id: str,
        name: str,
        widget_type: WidgetType,
        position: dict,
        config: dict,
        data_source_id: str | None = None,
        query: str | None = None,
    ) -> Widget:
        widget = Widget(
            id=generate_uuid(),
            dashboard_id=dashboard_id,
            name=name,
            type=widget_type,
            position=position,
            config=config,
            data_source_id=data_source_id,
            query=query,
        )
        return self.repository.create(widget)
