from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.responses import Response


dashboards_created_total = Counter(
    "dashboards_created_total",
    "Total dashboards created",
    ["user_role"],
)

etl_jobs_total = Counter(
    "etl_jobs_total",
    "Total ETL jobs",
    ["data_source_type", "status"],
)

metric_calculation_duration = Histogram(
    "metric_calculation_duration_seconds",
    "Time spent calculating metrics",
    ["metric_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
)

query_execution_duration = Histogram(
    "query_execution_duration_seconds",
    "Database query execution time",
    ["query_type"],
)

active_widgets = Gauge("active_widgets", "Active widgets count")
cache_hit_rate = Gauge("cache_hit_rate", "Cache hit rate")


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
