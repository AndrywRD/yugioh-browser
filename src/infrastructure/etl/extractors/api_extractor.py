from __future__ import annotations

import pandas as pd

from src.infrastructure.connectors import RestAPIConnector
from src.infrastructure.etl.extractors.base_extractor import BaseExtractor


class APIExtractor(BaseExtractor):
    def __init__(self, connector: RestAPIConnector | None = None) -> None:
        self.connector = connector or RestAPIConnector()

    def extract(self, config: dict) -> pd.DataFrame:
        payload = self.connector.fetch(config)
        if isinstance(payload, dict):
            records = payload.get("data")
            if isinstance(records, list):
                return pd.DataFrame(records)
            return pd.DataFrame([payload])
        return pd.DataFrame(payload)
