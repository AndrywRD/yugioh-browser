from abc import ABC, abstractmethod

from src.domain.entities import Alert


class AlertRepository(ABC):
    @abstractmethod
    def create(self, alert: Alert) -> Alert:
        raise NotImplementedError

    @abstractmethod
    def update(self, alert: Alert) -> Alert:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, alert_id: str) -> Alert | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[Alert]:
        raise NotImplementedError

    @abstractmethod
    def list_active(self) -> list[Alert]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, alert_id: str) -> bool:
        raise NotImplementedError
