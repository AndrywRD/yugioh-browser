from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import Dashboard
from src.domain.repositories import DashboardRepository
from src.infrastructure.persistence.models import DashboardModel
from src.infrastructure.persistence.repositories.mappers import model_to_dashboard


class PostgresDashboardRepository(DashboardRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, dashboard: Dashboard) -> Dashboard:
        model = DashboardModel(
            id=dashboard.id,
            user_id=dashboard.user_id,
            name=dashboard.name,
            description=dashboard.description,
            layout=dashboard.layout,
            refresh_interval=dashboard.refresh_interval,
            is_public=dashboard.is_public,
            is_favorite=dashboard.is_favorite,
        )
        self.session.add(model)
        self.session.flush()
        return model_to_dashboard(model)

    def update(self, dashboard: Dashboard) -> Dashboard:
        model = self.session.get(DashboardModel, dashboard.id)
        if model is None:
            return dashboard
        model.name = dashboard.name
        model.description = dashboard.description
        model.layout = dashboard.layout
        model.refresh_interval = dashboard.refresh_interval
        model.is_public = dashboard.is_public
        model.is_favorite = dashboard.is_favorite
        self.session.flush()
        return model_to_dashboard(model)

    def get_by_id(self, dashboard_id: str) -> Dashboard | None:
        model = self.session.get(DashboardModel, dashboard_id)
        return model_to_dashboard(model) if model else None

    def list_by_user(self, user_id: str) -> list[Dashboard]:
        stmt = select(DashboardModel).where(DashboardModel.user_id == user_id).order_by(DashboardModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_dashboard(item) for item in models]

    def delete(self, dashboard_id: str) -> bool:
        model = self.session.get(DashboardModel, dashboard_id)
        if model is None:
            return False
        self.session.delete(model)
        return True
