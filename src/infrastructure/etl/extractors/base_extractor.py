from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, config: dict) -> pd.DataFrame:
        raise NotImplementedError
