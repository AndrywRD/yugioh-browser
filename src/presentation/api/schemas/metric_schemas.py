from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from src.domain.enums import MetricType


class CalculateMetricRequest(BaseModel):
    widget_id: str | None = None
    metric_name: str = Field(..., min_length=1, max_length=255)
    values: list[float] = Field(default_factory=list)
    metric_type: MetricType = MetricType.SUM


class CompareMetricsRequest(BaseModel):
    left: float
    right: float


class MetricHistoryResponse(BaseModel):
    id: str
    widget_id: str | None
    metric_name: str
    metric_value: float
    metric_type: str
    timestamp: datetime


class MetricTrendRequest(BaseModel):
    values: list[float]
    window: int = Field(default=3, ge=1, le=100)
