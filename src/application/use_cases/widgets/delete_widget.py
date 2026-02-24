from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import WidgetRepository


class DeleteWidgetUseCase:
    def __init__(self, repository: WidgetRepository) -> None:
        self.repository = repository

    def execute(self, widget_id: str) -> bool:
        deleted = self.repository.delete(widget_id)
        if not deleted:
            raise EntityNotFoundError("Widget not found")
        return True
