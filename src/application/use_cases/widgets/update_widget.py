from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import WidgetRepository


class UpdateWidgetUseCase:
    def __init__(self, repository: WidgetRepository) -> None:
        self.repository = repository

    def execute(self, widget_id: str, **updates):
        widget = self.repository.get_by_id(widget_id)
        if widget is None:
            raise EntityNotFoundError("Widget not found")

        for key, value in updates.items():
            if value is not None and hasattr(widget, key):
                setattr(widget, key, value)

        return self.repository.update(widget)
