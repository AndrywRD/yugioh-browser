from abc import ABC, abstractmethod

from src.domain.entities import Widget


class WidgetRepository(ABC):
    @abstractmethod
    def create(self, widget: Widget) -> Widget:
        raise NotImplementedError

    @abstractmethod
    def update(self, widget: Widget) -> Widget:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, widget_id: str) -> Widget | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_dashboard(self, dashboard_id: str) -> list[Widget]:
        raise NotImplementedError

    @abstractmethod
    def list_by_data_source(self, data_source_id: str) -> list[Widget]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, widget_id: str) -> bool:
        raise NotImplementedError
