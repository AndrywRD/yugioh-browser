from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.persistence.models import AlertHistoryModel


class AlertHistoryRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, alert_id: str, metric_value: float, threshold: float, message: str | None = None) -> str:
        row = AlertHistoryModel(
            id=__import__("uuid").uuid4().hex,
            alert_id=alert_id,
            metric_value=metric_value,
            threshold=threshold,
            message=message,
        )
        self.session.add(row)
        self.session.flush()
        return row.id

    def acknowledge(self, alert_history_id: str, user_id: str) -> bool:
        row = self.session.get(AlertHistoryModel, alert_history_id)
        if row is None:
            return False
        row.acknowledged = True
        row.acknowledged_at = datetime.now(UTC)
        row.acknowledged_by = user_id
        self.session.flush()
        return True

    def list_all(self):
        stmt = select(AlertHistoryModel).order_by(AlertHistoryModel.triggered_at.desc())
        return self.session.scalars(stmt).all()
