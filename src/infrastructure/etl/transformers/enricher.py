from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.transformers.base_transformer import BaseTransformer


class DataEnricher(BaseTransformer):
    def transform(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        enriched = dataframe.copy()
        if "revenue" in enriched.columns and "customers" in enriched.columns:
            enriched["avg_ticket"] = enriched["revenue"] / enriched["customers"].replace(0, 1)
        if "date" in enriched.columns:
            enriched["date"] = pd.to_datetime(enriched["date"], errors="coerce")
            enriched["year"] = enriched["date"].dt.year
            enriched["month"] = enriched["date"].dt.month
        return enriched
