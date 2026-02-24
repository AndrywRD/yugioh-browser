from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.infrastructure.connectors.base_connector import BaseConnector


class FileConnector(BaseConnector):
    def test_connection(self, config: dict) -> bool:
        filepath = config.get("filepath")
        if not filepath:
            return False
        return Path(filepath).exists()

    def fetch(self, config: dict):
        filepath = config["filepath"]
        if filepath.endswith(".csv"):
            return pd.read_csv(filepath).to_dict(orient="records")
        if filepath.endswith(".xlsx") or filepath.endswith(".xls"):
            return pd.read_excel(filepath).to_dict(orient="records")
        raise ValueError("Unsupported file type")
