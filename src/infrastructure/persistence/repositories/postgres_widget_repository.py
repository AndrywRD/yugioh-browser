from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import Widget
from src.domain.repositories import WidgetRepository
from src.infrastructure.persistence.models import WidgetModel
from src.infrastructure.persistence.repositories.mappers import model_to_widget, widget_to_model


class PostgresWidgetRepository(WidgetRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, widget: Widget) -> Widget:
        model = widget_to_model(widget)
        self.session.add(model)
        self.session.flush()
        return model_to_widget(model)

    def update(self, widget: Widget) -> Widget:
        model = self.session.get(WidgetModel, widget.id)
        if model is None:
            return widget
        model.name = widget.name
        model.type = widget.type.value
        model.position = widget.position
        model.config = widget.config
        model.data_source_id = widget.data_source_id
        model.query = widget.query
        model.refresh_interval = widget.refresh_interval
        self.session.flush()
        return model_to_widget(model)

    def get_by_id(self, widget_id: str) -> Widget | None:
        model = self.session.get(WidgetModel, widget_id)
        return model_to_widget(model) if model else None

    def list_by_dashboard(self, dashboard_id: str) -> list[Widget]:
        stmt = select(WidgetModel).where(WidgetModel.dashboard_id == dashboard_id).order_by(WidgetModel.created_at.asc())
        models = self.session.scalars(stmt).all()
        return [model_to_widget(item) for item in models]

    def list_by_data_source(self, data_source_id: str) -> list[Widget]:
        stmt = (
            select(WidgetModel)
            .where(WidgetModel.data_source_id == data_source_id)
            .order_by(WidgetModel.created_at.asc())
        )
        models = self.session.scalars(stmt).all()
        return [model_to_widget(item) for item in models]

    def delete(self, widget_id: str) -> bool:
        model = self.session.get(WidgetModel, widget_id)
        if model is None:
            return False
        self.session.delete(model)
        return True
