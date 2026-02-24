from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.transformers.base_transformer import BaseTransformer


class DataCleaner(BaseTransformer):
    def transform(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        cleaned = dataframe.copy()
        cleaned = cleaned.drop_duplicates()
        for column in cleaned.columns:
            if cleaned[column].dtype.kind in {"i", "f"}:
                cleaned[column] = cleaned[column].fillna(0)
            else:
                cleaned[column] = cleaned[column].fillna("")
        return cleaned

    def clean(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        return self.transform(dataframe)
