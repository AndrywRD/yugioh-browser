from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import Alert
from src.domain.repositories import AlertRepository
from src.infrastructure.persistence.models import AlertModel
from src.infrastructure.persistence.repositories.mappers import alert_to_model, model_to_alert


class PostgresAlertRepository(AlertRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, alert: Alert) -> Alert:
        model = alert_to_model(alert)
        self.session.add(model)
        self.session.flush()
        return model_to_alert(model)

    def update(self, alert: Alert) -> Alert:
        model = self.session.get(AlertModel, alert.id)
        if model is None:
            return alert
        model.name = alert.name
        model.condition = {"operator": alert.threshold.operator, "threshold": alert.threshold.value}
        model.severity = alert.severity.value
        model.notification_channels = alert.notification_channels
        model.is_active = alert.is_active
        model.last_triggered_at = alert.last_triggered_at
        self.session.flush()
        return model_to_alert(model)

    def get_by_id(self, alert_id: str) -> Alert | None:
        model = self.session.get(AlertModel, alert_id)
        return model_to_alert(model) if model else None

    def list_by_user(self, user_id: str) -> list[Alert]:
        stmt = select(AlertModel).where(AlertModel.user_id == user_id).order_by(AlertModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_alert(item) for item in models]

    def list_active(self) -> list[Alert]:
        stmt = select(AlertModel).where(AlertModel.is_active.is_(True)).order_by(AlertModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_alert(item) for item in models]

    def delete(self, alert_id: str) -> bool:
        model = self.session.get(AlertModel, alert_id)
        if model is None:
            return False
        self.session.delete(model)
        return True
