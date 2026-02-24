from abc import ABC, abstractmethod

from src.domain.entities import DataSource


class DataSourceRepository(ABC):
    @abstractmethod
    def create(self, data_source: DataSource) -> DataSource:
        raise NotImplementedError

    @abstractmethod
    def update(self, data_source: DataSource) -> DataSource:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, data_source_id: str) -> DataSource | None:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[DataSource]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, data_source_id: str) -> bool:
        raise NotImplementedError
