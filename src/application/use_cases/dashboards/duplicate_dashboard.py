from src.domain.entities import Dashboard
from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import DashboardRepository
from src.shared.utils import generate_uuid


class DuplicateDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(self, dashboard_id: str, user_id: str) -> Dashboard:
        source = self.repository.get_by_id(dashboard_id)
        if source is None:
            raise EntityNotFoundError("Dashboard not found")

        copy_dashboard = Dashboard(
            id=generate_uuid(),
            user_id=user_id,
            name=f"{source.name} (Copy)",
            description=source.description,
            layout=source.layout,
            refresh_interval=source.refresh_interval,
            is_public=False,
        )
        return self.repository.create(copy_dashboard)
