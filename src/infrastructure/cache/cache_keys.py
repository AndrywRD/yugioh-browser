from dataclasses import dataclass


@dataclass(frozen=True)
class CacheKeys:
    DASHBOARD = "dashboard:{dashboard_id}"
    DASHBOARD_DATA = "dashboard:data:{dashboard_id}"
    WIDGET_DATA = "widget:data:{widget_id}"
    METRIC = "metric:{metric_name}:{time_range}"
    QUERY_RESULT = "query:{query_hash}"
