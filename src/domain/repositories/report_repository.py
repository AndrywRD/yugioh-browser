from abc import ABC, abstractmethod

from src.domain.entities import Report


class ReportRepository(ABC):
    @abstractmethod
    def create(self, report: Report) -> Report:
        raise NotImplementedError

    @abstractmethod
    def update(self, report: Report) -> Report:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, report_id: str) -> Report | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[Report]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, report_id: str) -> bool:
        raise NotImplementedError
