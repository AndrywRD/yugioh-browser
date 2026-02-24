from __future__ import annotations

import pandas as pd

from src.infrastructure.connectors import SQLConnector
from src.infrastructure.etl.extractors.base_extractor import BaseExtractor


class DatabaseExtractor(BaseExtractor):
    def __init__(self, connector: SQLConnector | None = None) -> None:
        self.connector = connector or SQLConnector()

    def extract(self, config: dict) -> pd.DataFrame:
        rows = self.connector.fetch(config)
        return pd.DataFrame(rows)
