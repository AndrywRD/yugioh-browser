from src.domain.entities import Dashboard
from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import DashboardRepository


class UpdateDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(self, dashboard_id: str, **updates) -> Dashboard:
        dashboard = self.repository.get_by_id(dashboard_id)
        if dashboard is None:
            raise EntityNotFoundError("Dashboard not found")

        for key, value in updates.items():
            if value is not None and hasattr(dashboard, key):
                setattr(dashboard, key, value)

        return self.repository.update(dashboard)
