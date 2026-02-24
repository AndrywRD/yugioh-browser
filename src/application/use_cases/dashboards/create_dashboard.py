from src.domain.entities import Dashboard
from src.domain.repositories import DashboardRepository
from src.shared.utils import generate_uuid


class CreateDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(
        self,
        user_id: str,
        name: str,
        description: str | None,
        layout: dict,
        refresh_interval: int,
        is_public: bool = False,
    ) -> Dashboard:
        dashboard = Dashboard(
            id=generate_uuid(),
            user_id=user_id,
            name=name,
            description=description,
            layout=layout,
            refresh_interval=refresh_interval,
            is_public=is_public,
        )
        return self.repository.create(dashboard)
