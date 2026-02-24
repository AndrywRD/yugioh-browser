from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.transformers.base_transformer import BaseTransformer


class Aggregator(BaseTransformer):
    def __init__(self, group_by: list[str] | None = None, aggregations: dict | None = None) -> None:
        self.group_by = group_by or []
        self.aggregations = aggregations or {}

    def transform(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        if not self.group_by or not self.aggregations:
            return dataframe
        return dataframe.groupby(self.group_by, dropna=False).agg(self.aggregations).reset_index()
