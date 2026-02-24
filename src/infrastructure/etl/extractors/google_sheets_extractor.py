from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.extractors.base_extractor import BaseExtractor


class GoogleSheetsExtractor(BaseExtractor):
    def extract(self, config: dict) -> pd.DataFrame:
        # Lightweight fallback: accept injected rows from config when gspread is not configured.
        rows = config.get("rows", [])
        return pd.DataFrame(rows)
