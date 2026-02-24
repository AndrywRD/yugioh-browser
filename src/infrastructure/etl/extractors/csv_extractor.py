from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.infrastructure.etl.extractors.base_extractor import BaseExtractor


class CSVExtractor(BaseExtractor):
    def extract(self, config: dict) -> pd.DataFrame:
        filepath = config.get("filepath")
        if not filepath:
            raise ValueError("Missing required config key: filepath")

        file_path_obj = Path(str(filepath))
        if not file_path_obj.exists():
            raise FileNotFoundError(f"CSV file not found: {filepath}")

        return pd.read_csv(file_path_obj)
