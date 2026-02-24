from abc import ABC, abstractmethod

from src.domain.entities import Dashboard


class DashboardRepository(ABC):
    @abstractmethod
    def create(self, dashboard: Dashboard) -> Dashboard:
        raise NotImplementedError

    @abstractmethod
    def update(self, dashboard: Dashboard) -> Dashboard:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, dashboard_id: str) -> Dashboard | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[Dashboard]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, dashboard_id: str) -> bool:
        raise NotImplementedError
