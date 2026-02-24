from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd


class BaseTransformer(ABC):
    @abstractmethod
    def transform(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        raise NotImplementedError
