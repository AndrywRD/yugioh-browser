from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.application.services import MetricCalculationService
from src.application.use_cases.metrics import (
    CalculateMetricUseCase,
    CompareMetricsUseCase,
    ExportMetricDataUseCase,
    GetMetricHistoryUseCase,
    GetMetricTrendUseCase,
)
from src.infrastructure.monitoring import metric_calculation_duration
from src.presentation.api.dependencies import get_db, get_metric_repository
from src.presentation.api.schemas import (
    CalculateMetricRequest,
    CompareMetricsRequest,
    MetricHistoryResponse,
    MetricTrendRequest,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("")
def list_metrics(
    metric_name: str = Query(default="revenue"),
    days: int = Query(default=30, ge=1, le=365),
    widget_id: str | None = Query(default=None),
    metric_repo=Depends(get_metric_repository),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    use_case = GetMetricHistoryUseCase(metric_repo)
    history = use_case.execute(metric_name, start_date, end_date, widget_id)
    return [
        MetricHistoryResponse(
            id=item.id,
            widget_id=item.widget_id,
            metric_name=item.metric_name,
            metric_value=item.value_as_float,
            metric_type=item.metric_type.value,
            timestamp=item.timestamp,
        )
        for item in history
    ]


@router.post("/calculate", response_model=MetricHistoryResponse)
def calculate_metric(
    payload: CalculateMetricRequest,
    metric_repo=Depends(get_metric_repository),
    db: Session = Depends(get_db),
):
    service = MetricCalculationService()
    use_case = CalculateMetricUseCase(metric_repo, service)

    with metric_calculation_duration.labels(metric_type=payload.metric_type.value).time():
        metric = use_case.execute(
            widget_id=payload.widget_id,
            metric_name=payload.metric_name,
            values=payload.values,
            metric_type=payload.metric_type,
        )
    db.commit()

    return MetricHistoryResponse(
        id=metric.id,
        widget_id=metric.widget_id,
        metric_name=metric.metric_name,
        metric_value=metric.value_as_float,
        metric_type=metric.metric_type.value,
        timestamp=metric.timestamp,
    )


@router.get("/{metric_name}/history", response_model=list[MetricHistoryResponse])
def get_metric_history(
    metric_name: str,
    days: int = Query(default=30, ge=1, le=365),
    widget_id: str | None = Query(default=None),
    metric_repo=Depends(get_metric_repository),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    use_case = GetMetricHistoryUseCase(metric_repo)
    history = use_case.execute(metric_name, start_date, end_date, widget_id)
    return [
        MetricHistoryResponse(
            id=item.id,
            widget_id=item.widget_id,
            metric_name=item.metric_name,
            metric_value=item.value_as_float,
            metric_type=item.metric_type.value,
            timestamp=item.timestamp,
        )
        for item in history
    ]


@router.post("/compare")
def compare_metrics(payload: CompareMetricsRequest):
    use_case = CompareMetricsUseCase(MetricCalculationService())
    return use_case.execute(payload.left, payload.right)


@router.post("/{metric_name}/trend")
def get_metric_trend(metric_name: str, payload: MetricTrendRequest):
    use_case = GetMetricTrendUseCase(MetricCalculationService())
    return {"metric_name": metric_name, **use_case.execute(payload.values, payload.window)}


@router.get("/{metric_name}/trend")
def get_metric_trend_from_history(
    metric_name: str,
    days: int = Query(default=30, ge=1, le=365),
    widget_id: str | None = Query(default=None),
    metric_repo=Depends(get_metric_repository),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    history_use_case = GetMetricHistoryUseCase(metric_repo)
    values = [item.value_as_float for item in history_use_case.execute(metric_name, start_date, end_date, widget_id)]
    trend_use_case = GetMetricTrendUseCase(MetricCalculationService())
    return {"metric_name": metric_name, **trend_use_case.execute(values, window=3)}


@router.get("/{metric_name}/export")
def export_metric_data(
    metric_name: str,
    fmt: str = Query(default="csv", pattern="^(csv|excel)$"),
    days: int = Query(default=30, ge=1, le=365),
    metric_repo=Depends(get_metric_repository),
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    history_use_case = GetMetricHistoryUseCase(metric_repo)
    rows = [
        {
            "id": item.id,
            "widget_id": item.widget_id,
            "metric_name": item.metric_name,
            "metric_value": item.value_as_float,
            "metric_type": item.metric_type.value,
            "timestamp": item.timestamp.isoformat() if item.timestamp else None,
        }
        for item in history_use_case.execute(metric_name, start_date, end_date)
    ]
    exporter = ExportMetricDataUseCase()
    payload = exporter.execute(rows, fmt)
    return {"metric_name": metric_name, "format": fmt, "bytes": len(payload)}
