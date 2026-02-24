from src.presentation.api.schemas.alert_schemas import AlertCreateRequest, AlertResponse, AlertUpdateRequest
from src.presentation.api.schemas.auth_schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from src.presentation.api.schemas.dashboard_schemas import (
    DashboardCreateRequest,
    DashboardDataResponse,
    DashboardResponse,
    DashboardUpdateRequest,
)
from src.presentation.api.schemas.data_source_schemas import (
    DataSourceCreateRequest,
    DataSourceResponse,
    DataSourceUpdateRequest,
)
from src.presentation.api.schemas.metric_schemas import (
    CalculateMetricRequest,
    CompareMetricsRequest,
    MetricHistoryResponse,
    MetricTrendRequest,
)
from src.presentation.api.schemas.report_schemas import GenerateReportRequest, ReportResponse, ScheduleReportRequest
from src.presentation.api.schemas.widget_schemas import WidgetCreateRequest, WidgetResponse, WidgetUpdateRequest

__all__ = [
    "AlertCreateRequest",
    "AlertResponse",
    "AlertUpdateRequest",
    "CalculateMetricRequest",
    "CompareMetricsRequest",
    "DashboardCreateRequest",
    "DashboardDataResponse",
    "DashboardResponse",
    "DashboardUpdateRequest",
    "DataSourceCreateRequest",
    "DataSourceResponse",
    "DataSourceUpdateRequest",
    "GenerateReportRequest",
    "LoginRequest",
    "MetricHistoryResponse",
    "MetricTrendRequest",
    "RegisterRequest",
    "ReportResponse",
    "ScheduleReportRequest",
    "TokenResponse",
    "UserResponse",
    "WidgetCreateRequest",
    "WidgetResponse",
    "WidgetUpdateRequest",
]
