from src.application.services import DashboardService
from src.domain.exceptions import EntityNotFoundError
from src.domain.repositories import DashboardRepository


class GetDashboardDataUseCase:
    def __init__(self, repository: DashboardRepository, service: DashboardService) -> None:
        self.repository = repository
        self.service = service

    def execute(self, dashboard_id: str) -> dict:
        dashboard = self.repository.get_by_id(dashboard_id)
        if dashboard is None:
            raise EntityNotFoundError("Dashboard not found")
        return self.service.build_dashboard_data(dashboard)
