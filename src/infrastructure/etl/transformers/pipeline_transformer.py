from __future__ import annotations

import pandas as pd

from src.infrastructure.etl.transformers.aggregator import Aggregator
from src.infrastructure.etl.transformers.base_transformer import BaseTransformer
from src.infrastructure.etl.transformers.cleaner import DataCleaner
from src.infrastructure.etl.transformers.enricher import DataEnricher


class ETLTransformer(BaseTransformer):
    def __init__(self, cleaner: DataCleaner | None = None, enricher: DataEnricher | None = None, aggregator: Aggregator | None = None) -> None:
        self.cleaner = cleaner or DataCleaner()
        self.enricher = enricher or DataEnricher()
        self.aggregator = aggregator

    def transform(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        cleaned = self.cleaner.transform(dataframe)
        enriched = self.enricher.transform(cleaned)
        if self.aggregator:
            return self.aggregator.transform(enriched)
        return enriched
