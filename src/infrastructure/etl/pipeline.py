from __future__ import annotations

from datetime import UTC, datetime

import pandas as pd

from src.domain.entities import Metric
from src.domain.enums import MetricType
from src.domain.value_objects import MetricValue
from src.infrastructure.etl.extractors import APIExtractor, CSVExtractor, DatabaseExtractor, GoogleSheetsExtractor
from src.infrastructure.etl.loaders import CacheLoader, WarehouseLoader
from src.infrastructure.etl.transformers import ETLTransformer
from src.infrastructure.persistence import db_session_scope
from src.infrastructure.persistence.repositories import PostgresWidgetRepository, TimescaleMetricRepository
from src.shared.utils import generate_uuid


class ETLPipeline:
    EXTRACTORS = {
        "api": APIExtractor,
        "database": DatabaseExtractor,
        "csv": CSVExtractor,
        "google_sheets": GoogleSheetsExtractor,
    }

    def __init__(self, transformer: ETLTransformer | None = None) -> None:
        self.transformer = transformer or ETLTransformer()
        self.warehouse_loader = WarehouseLoader()
        self.cache_loader = CacheLoader()

    def run(
        self,
        source_type: str,
        extract_config: dict,
        destination_table: str,
        data_source_id: str | None = None,
    ) -> dict:
        extractor_cls = self.EXTRACTORS.get(source_type)
        if extractor_cls is None:
            raise ValueError(f"Unsupported source type: {source_type}")

        extractor = extractor_cls()
        extracted = extractor.extract(extract_config)
        transformed = self.transformer.transform(extracted)
        loaded_rows = self.warehouse_loader.load(transformed, destination_table)
        self.cache_loader.load(transformed, f"etl:{destination_table}:latest")
        metrics_generated = 0
        if data_source_id:
            metrics_generated = self._materialize_metrics_from_dataframe(data_source_id, transformed)

        return {
            "rows_extracted": len(extracted.index) if isinstance(extracted, pd.DataFrame) else 0,
            "rows_loaded": loaded_rows,
            "metrics_generated": metrics_generated,
            "destination": destination_table,
            "status": "completed",
        }

    def _materialize_metrics_from_dataframe(self, data_source_id: str, dataframe: pd.DataFrame) -> int:
        if dataframe.empty:
            return 0

        numeric_columns = list(dataframe.select_dtypes(include="number").columns)
        if not numeric_columns:
            return 0

        with db_session_scope() as session:
            widget_repo = PostgresWidgetRepository(session)
            metric_repo = TimescaleMetricRepository(session)
            widgets = widget_repo.list_by_data_source(data_source_id)

            if not widgets:
                return 0

            metrics: list[Metric] = []
            timestamp = datetime.now(UTC)

            for widget in widgets:
                config = widget.config if isinstance(widget.config, dict) else {}
                metric_column = self._resolve_metric_column(config, numeric_columns, list(dataframe.columns))
                if metric_column is None:
                    continue

                series = pd.to_numeric(dataframe[metric_column], errors="coerce").dropna()
                if series.empty:
                    continue

                aggregation = str(config.get("aggregation", "sum")).lower()
                value, metric_type = self._aggregate_series(series, aggregation)
                metric_name = str(config.get("metric") or metric_column)

                metrics.append(
                    Metric(
                        id=generate_uuid(),
                        widget_id=widget.id,
                        metric_name=metric_name,
                        metric_value=MetricValue(value),
                        metric_type=metric_type,
                        timestamp=timestamp,
                        dimensions={"data_source_id": data_source_id},
                    )
                )

            if not metrics:
                return 0

            return metric_repo.create_many(metrics)

    @staticmethod
    def _resolve_metric_column(config: dict, numeric_columns: list[str], dataframe_columns: list[str]) -> str | None:
        config_metric = config.get("metric")
        if isinstance(config_metric, str) and config_metric in dataframe_columns:
            return config_metric

        if numeric_columns:
            return numeric_columns[0]

        return None

    @staticmethod
    def _aggregate_series(series: pd.Series, aggregation: str) -> tuple[float, MetricType]:
        if aggregation in {"sum", "total"}:
            return float(series.sum()), MetricType.SUM
        if aggregation in {"avg", "average", "mean"}:
            return float(series.mean()), MetricType.AVG
        if aggregation == "count":
            return float(series.count()), MetricType.COUNT
        if aggregation == "min":
            return float(series.min()), MetricType.MIN
        if aggregation == "max":
            return float(series.max()), MetricType.MAX
        if aggregation == "percentile":
            return float(series.quantile(0.95)), MetricType.PERCENTILE

        return float(series.iloc[-1]), MetricType.RAW
