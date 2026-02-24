from __future__ import annotations

from typing import Any

import pandas as pd


class ETLService:
    def __init__(self, extractor: Any, transformer: Any, loader: Any) -> None:
        self.extractor = extractor
        self.transformer = transformer
        self.loader = loader

    def run(self, config: dict, destination: str) -> dict:
        extracted = self.extractor.extract(config)
        transformed = self.transformer.transform(extracted)
        loaded_rows = self.loader.load(transformed, destination)

        return {
            "rows_extracted": len(extracted.index) if isinstance(extracted, pd.DataFrame) else 0,
            "rows_loaded": loaded_rows,
            "status": "completed",
        }
