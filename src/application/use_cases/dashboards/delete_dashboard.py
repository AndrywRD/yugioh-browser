from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import DashboardRepository


class DeleteDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(self, dashboard_id: str) -> bool:
        deleted = self.repository.delete(dashboard_id)
        if not deleted:
            raise EntityNotFoundError("Dashboard not found")
        return True
