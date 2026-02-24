from __future__ import annotations

from abc import ABC, abstractmethod


class BaseConnector(ABC):
    @abstractmethod
    def test_connection(self, config: dict) -> bool:
        raise NotImplementedError

    @abstractmethod
    def fetch(self, config: dict):
        raise NotImplementedError
