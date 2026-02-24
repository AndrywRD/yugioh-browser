from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd


class BaseLoader(ABC):
    @abstractmethod
    def load(self, dataframe: pd.DataFrame, destination: str) -> int:
        raise NotImplementedError
