from __future__ import annotations

import pandas as pd

from src.infrastructure.cache import cache_service
from src.infrastructure.etl.loaders.base_loader import BaseLoader


class CacheLoader(BaseLoader):
    def load(self, dataframe: pd.DataFrame, destination: str) -> int:
        rows = dataframe.to_dict(orient="records")
        cache_service.set(destination, rows, ttl=300)
        return len(rows)
