from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import Metric
from src.domain.repositories import MetricRepository
from src.infrastructure.persistence.models import MetricModel
from src.infrastructure.persistence.repositories.mappers import metric_to_model, model_to_metric


class TimescaleMetricRepository(MetricRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, metric: Metric) -> Metric:
        model = metric_to_model(metric)
        self.session.add(model)
        self.session.flush()
        return model_to_metric(model)

    def create_many(self, metrics: list[Metric]) -> int:
        if not metrics:
            return 0
        models = [metric_to_model(item) for item in metrics]
        self.session.add_all(models)
        self.session.flush()
        return len(models)

    def get_history(
        self,
        metric_name: str,
        start_date: datetime,
        end_date: datetime,
        widget_id: str | None = None,
    ) -> list[Metric]:
        stmt = select(MetricModel).where(
            MetricModel.metric_name == metric_name,
            MetricModel.timestamp >= start_date,
            MetricModel.timestamp <= end_date,
        )
        if widget_id:
            stmt = stmt.where(MetricModel.widget_id == widget_id)

        stmt = stmt.order_by(MetricModel.timestamp.asc())
        rows = self.session.scalars(stmt).all()
        return [model_to_metric(row) for row in rows]

    def get_latest_by_widget(self, widget_id: str) -> Metric | None:
        stmt = (
            select(MetricModel)
            .where(MetricModel.widget_id == widget_id)
            .order_by(MetricModel.timestamp.desc())
            .limit(1)
        )
        row = self.session.scalars(stmt).first()
        return model_to_metric(row) if row else None
