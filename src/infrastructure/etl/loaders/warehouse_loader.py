from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.loaders.base_loader import BaseLoader
from src.infrastructure.persistence.database import engine


class WarehouseLoader(BaseLoader):
    def load(self, dataframe: pd.DataFrame, destination: str) -> int:
        dataframe.to_sql(destination, engine, if_exists="append", index=False)
        return len(dataframe.index)
