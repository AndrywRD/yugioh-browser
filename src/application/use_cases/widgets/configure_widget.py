from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import WidgetRepository


class ConfigureWidgetUseCase:
    def __init__(self, repository: WidgetRepository) -> None:
        self.repository = repository

    def execute(self, widget_id: str, config: dict):
        widget = self.repository.get_by_id(widget_id)
        if widget is None:
            raise EntityNotFoundError("Widget not found")
        widget.config = config
        return self.repository.update(widget)
